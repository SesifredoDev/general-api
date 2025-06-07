const Weapon = require('../models/weaponModel');
const Spell = require('../models/spellModel');
const Item = require('../models/itemModel');
const StarterPack = require('../models/starterPackModel');
const User = require('../models/userModel');

const fs = require('fs');
const path = require('path');

// Helper to get a random item by rarity percentage
function getRandomByRarity(items) {
  const total = items.reduce((sum, item) => sum + (item.rarity?.percentage || 0), 0);
  const rand = Math.random() * total;
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.rarity?.percentage || 0;
    if (rand <= cumulative) return item;
  }
  return items[0]; // fallback
}

// Generic CRUD functions
exports.getAll = model => async (req, res) => {
  const items = await model.find();
  res.json(items);
};

exports.getById = model => async (req, res) => {
  const item = await model.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
};

exports.addNew = model => async (req, res) => {
  const newItem = new model(req.body);
  await newItem.save();
  res.status(201).json(newItem);
};

exports.addBatch = model => async (req, res) => {
  const batch = req.body;

  if (!Array.isArray(batch) || batch.length === 0) {
    return res.status(400).json({ message: 'Request body must be a non-empty array.' });
  }

  try {
    const inserted = await model.insertMany(batch);
    res.status(201).json({ message: 'Batch added successfully', inserted });
  } catch (err) {
    console.error('Batch insert error:', err);
    res.status(500).json({ message: 'Failed to insert batch', error: err.message });
  }
};


exports.updateItem = model => async (req, res) => {
  const updated = await model.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
};

exports.getRandom = model => async (req, res) => {
  const items = await model.find();
  if (!items.length) return res.status(404).json({ message: 'No entries found' });
  const selected = getRandomByRarity(items);
  res.json(selected);
};


exports.addStarterPack = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Missing request body" });
    }

    const { name, description, items = [], weapons = [], spells = [] } = req.body;

    const savedItems = await Item.insertMany(items);
    const savedWeapons = await Weapon.insertMany(weapons);
    const savedSpells = await Spell.insertMany(spells);

    const newPack = new StarterPack({
      name,
      description,
      items: savedItems.map(i => i._id),
      weapons: savedWeapons.map(w => w._id),
      spells: savedSpells.map(s => s._id),
    });

    await newPack.save();

    res.status(201).json({ message: 'Starter pack created', pack: newPack });
  } catch (err) {
    console.error('Error creating starter pack:', err);
    res.status(500).json({ message: 'Failed to create starter pack', error: err.message });
  }
};
// Get all starter packs (for user to choose)
exports.getStarterPacks = async (req, res) => {
  const packs = await StarterPack.find()
    .populate('weapons')
    .populate('spells')
    .populate('items');
  res.json(packs);
};

// User picks a starter pack
exports.selectStarterPack = async (req, res) => {
  const { userId, packId } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.starterPackSelected) {
    return res.status(400).json({ message: 'Starter pack already selected' });
  }

  const pack = await StarterPack.findById(packId);
  if (!pack) return res.status(404).json({ message: 'Pack not found' });

  user.weapons.push(...pack.weapons);
  user.spells.push(...pack.spells);
  user.items.push(...pack.items);
  user.starterPackSelected = true;

  await user.save();
  const populatedUser = await user
    .populate('weapons')
    .populate('spells')
    .populate('items')
    .select('-password');

  const finalUser = processUserEquipment(populatedUser);

  res.json({ message: 'Starter pack applied', finalUser });
};

function getDiceExpressionByValue(value) {
  const dicePath = path.join(__dirname, '../assets/dice.json');

  let diceTable;
  try {
    const rawData = fs.readFileSync(dicePath, 'utf-8');
    diceTable = JSON.parse(rawData);
  } catch (err) {
    console.error('Error reading dice.json:', err);
    return null;
  }

  const match = diceTable.find(entry => entry.value === value);
  return match ? match.dice : "3d20";
}

function attachDiceToActions(actions = [], userStats = {}) {
  return actions.map(action => {
    const statKey = action.stat;
    const statVal = userStats[statKey]?.level || 1; // fallback to 1
    return {
      ...action,
      dice: getDiceExpressionByValue(statVal + action?.mod)
    };
  });
}

exports.processUserEquipment = (user) => {
  const userObj = user.toObject(); // deep clone with populated fields
  const stats = userObj.stats;

  if (Array.isArray(userObj.weapons)) {
    userObj.weapons = userObj.weapons.map(w => ({
      ...w,
      actions: attachDiceToActions(w.actions, stats)
    }));
  }

  if (Array.isArray(userObj.spells)) {
    userObj.spells = userObj.spells.map(s => ({
      ...s,
      actions: attachDiceToActions(s.actions, stats)
    }));
  }

  if (Array.isArray(userObj.items)) {
    userObj.items = userObj.items.map(i => {
      const statKey = i.effect?.stat;
      const statLevel = stats[statKey]?.level || 1;
      return {
        ...i,
        effect: {
          ...i.effect,
          dice: getDiceExpressionByValue(statLevel)
        }
      };
    });
  }

  return userObj;
}
