const Weapon = require('../models/weaponModel');
const Spell = require('../models/spellModel');
const Item = require('../models/itemModel');

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
