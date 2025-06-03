const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// REGISTER
exports.register = async (req, res) => {
  const { username, name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const stats = {
      str: { slug: "str", name: "Strength", level: 1, xp: 0 },
      int: { slug: "int", name: "Intelligence", level: 1, xp: 0 },
      wis: { slug: "wis", name: "Wisdom", level: 1, xp: 0 },
      dex: { slug: "dex", name: "Dexterity", level: 1, xp: 0 },
      cha: { slug: "cha", name: "Charisma", level: 1, xp: 0 },
      con: { slug: "con", name: "Constitution", level: 1, xp: 0 }
    };

    const newUser = new User({
      username,
      name,
      email,
      password: hashedPassword,
      type: 1,
      avatar: "",
      icon: "",
      class: "",
      level: 1,
      xp: 0,
      stats,
      lastEntry: "",
      refreshTokens: [] // ✅ required to prevent undefined
    });

    await newUser.save();
    res.status(201).json({ message: 'User created', userId: newUser._id });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Initialize refreshTokens array if missing
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({ token, refreshToken, userId: user._id });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  console.log("Received refresh token:", refreshToken);

  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.userId);

    if (!user) {
      console.warn("User not found during refresh");
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      console.warn("Refresh token mismatch");
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log("Issuing new token:", newToken);

    return res.json({ token: newToken }); // ✅ Make sure this always returns if success
  } catch (err) {
    console.error("JWT refresh verify failed:", err.message);
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.userId);
    if (user && user.refreshTokens) {
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(400).json({ message: 'Invalid token' });
  }
};

// GET USER BY ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error("User lookup failed:", err.message);
    res.status(400).json({ message: 'Invalid ID format' });
  }
};
