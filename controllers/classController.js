const GameClass = require('../models/classModel');

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await GameClass.find();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve classes', error: err.message });
  }
};

exports.addBatchClasses = async (req, res) => {
  const batch = req.body;

  if (!Array.isArray(batch) || batch.length === 0) {
    return res.status(400).json({ message: 'Request body must be a non-empty array of classes.' });
  }

  try {
    const inserted = await GameClass.insertMany(batch);
    res.status(201).json({ message: 'Classes added successfully', inserted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to insert classes', error: err.message });
  }
};


exports.addAbilitiesToClass = async (req, res) => {
  const { classId, abilities } = req.body;

  if (!classId || !Array.isArray(abilities) || abilities.length === 0) {
    return res.status(400).json({ message: 'classId and non-empty abilities array are required' });
  }

  try {
    const gameClass = await GameClass.findById(classId);
    if (!gameClass) return res.status(404).json({ message: 'Class not found' });

    gameClass.abilities.push(...abilities);
    await gameClass.save();

    res.status(200).json({ message: 'Abilities added successfully', updatedClass: gameClass });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add abilities', error: err.message });
  }
};
