const mongoose = require('mongoose');

const trainingDataSchema = new mongoose.Schema({
  type: { type: Number, required: true },
  label: { type: String, required: true },
  value: { type: Number, required: true },
  stat: { type: String, required: true }
});

module.exports = mongoose.model('TrainingData', trainingDataSchema);
