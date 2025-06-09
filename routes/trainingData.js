const express = require('express');
const router = express.Router();
const TrainingData = require('../models/trainingData');

// Add single entry
router.post('/add', async (req, res) => {
  try {
    const data = new TrainingData(req.body);
    await data.save();
    res.status(201).json({ message: 'Entry added', data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add multiple entries
router.post('/batchAdd', async (req, res) => {
  try {
    const dataArray = req.body;
    if (!Array.isArray(dataArray)) {
      return res.status(400).json({ error: 'Expected array of entries' });
    }
    const result = await TrainingData.insertMany(dataArray);
    res.status(201).json({ message: 'Batch added', result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Optional: Get all entries
router.get('/', async (req, res) => {
  const data = await TrainingData.find();
  res.json(data);
});

module.exports = router;
