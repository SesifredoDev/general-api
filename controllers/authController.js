// controllers/userController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const ClassModel = require('../models/classModel');
const Weapon = require('../models/weaponModel');
const Spell = require('../models/spellModel');
const Item = require('../models/itemModel');
const StarterPack = require('../models/starterPackModel');
const fs = require('fs');
const path = require('path');

const { processUserEquipment } = require('./equipmentController');

// Register a new user
exports.register = async (req, res) => {
  const { username, name, email, password, type } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const stats = ['str','int','wis','dex','cha','con'].reduce((acc, key) => {
    acc[key] = { slug: key, name: key.toUpperCase(), level: 1, xp: 0 };
    return acc;
  }, {});

  const newUser = new User({
    username,
    name,
    email,
    password: hashedPassword,
    type,
    avatar: "",
    icon: "",
    class: null,
    level: 1,
    xp: 0,
    hp: 5,
    stats,
    lastEntry: "",
    steak: 0,
    party: null,
    armour: 5,
    evasion: 3,
    weapons: [],
    spells: [],
    items: []
  });

  await newUser.save();
  res.status(201).json({ message: 'User created', userId: newUser._id });
};

// Login and generate tokens
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password))
    return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  user.refreshTokens.push(refreshToken);
  await user.save();
  res.json({ token, refreshToken, userId: user._id });
};

// Token refresh
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(refreshToken))
      return res.status(403).json({ message: 'Invalid refresh token' });

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: newToken });
  } catch {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// Logout (invalidate refresh token)
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

// Get full user profile with applied bonuses (not persisted)
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id)
      .populate('class')
      .populate('weapons')
      .populate('spells')
      .populate('items')
      .select('-password -name -email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userClone = user.toObject();
    
    const classAppliedFeatures = applyClassAbilities(userClone);
    userClone.stats = classAppliedFeatures.stats;
    const finalUser = processUserEquipment(userClone);
    finalUser.stats = classAppliedFeatures.stats;
    console.log(finalUser);
    res.json(finalUser);

  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid ID format or error' });
  }
};

// Get user by username
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





function applyClassAbilities(userObj) {
  let stats = userObj.stats;
  let spells = userObj.spells;
  let weapons  = userObj.weapons
  let hpBonus = 0;
  let armourBonus = 0;
  
  if (!userObj.class?.abilities) return {
    hpBonus,
    armourBonus,
    stats,
    spells,
    weapons,
  };

  userObj.abilities ??= [];

  for (const ability of userObj.class.abilities) {
    if (userObj.level >= ability.level) {
      const alreadyHas = userObj.abilities.some(a => a.name === ability.name);
      if (!alreadyHas) {
        userObj.abilities.push(ability);
      }

      if (ability.passive) {
        const mod = ability.mod || 0;
        const statKey = ability.stat;

        if (stats[statKey]) {
          stats[statKey].level += mod;
        }
      }
    }
  }

  return {
    hpBonus,
    armourBonus,
    stats: { ...stats }, // return a shallow copy to avoid unintended mutation,
    spells:{...spells},
    weapons: {...weapons},
    
  };
}
