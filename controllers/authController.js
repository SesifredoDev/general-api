const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const { processUserEquipment } = require('./equipmentController')

exports.register = async (req, res) => {
  const { username, name, email, password, type } = req.body;
  console.log("body", req.body)
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);

  let stats = {
    str: {
      slug: "str",
      name: "Strength",
      level: 1,
      xp: 0,
    },
    int: {
      slug: "int",
      name: "Intelligence",
      level: 1,
      xp: 0,
    },
    wis: {
      slug: "wis",
      name: "Wisdom",
      level: 1,
      xp: 0,
    },
    dex: {
      slug: "dex",
      name: "Dexterity",
      level: 1,
      xp: 0,
    },
    cha: {
      slug: "cha",
      name: "Charisma",
      level: 1,
      xp: 0,
    },
    con: {
      slug: "con",
      name: "Constitution",
      level: 1,
      xp: 0,
    }
  }

  const newUser = new User({
    username,
    name,
    email,
    password: hashedPassword,
    type,
    avatar: "",
    icon: "",
    class: "",
    level: 1,
    xp: 0,
    hp: 5,
    stats,
    lastEntry: "",
    steak: 0,
    party: null,
    armour: 10,
    evasion: 5,
    weapons: [],
    spells: [],
    items: []
  });

  await newUser.save();
  res.status(201).json({
    message: 'User created',
    userId: newUser._id
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  user.refreshTokens.push(refreshToken); // store multiple refresh tokens
  await user.save();

  res.json({
    token,
    refreshToken,
    userId: user._id
  });
};
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    console.log(refreshToken, payload.userId);
    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: newToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.userId);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    }
    res.json({ message: 'Logged out' });
  } catch {
    res.status(400).json({ message: 'Invalid token' });
  }
};
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select('-password'); // Don't return password
    if (!user) return res.status(404).json({ message: 'User not found' });
    const populatedUser = user
      .populate('weapons')
      .populate('spells')
      .populate('items')
      .select('-password');
    const finalUser = processUserEquipment(populatedUser);
    console.log(user, populatedUser, finalUser)
    res.json(finalUser);
    
  } catch (err) {
    res.status(400).json({ message: 'Invalid ID format' });
  }
};


exports.getUserByUsername = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username }).select('_id username');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch {
    res.status(400).json({ message: 'Server error' });
  }
};