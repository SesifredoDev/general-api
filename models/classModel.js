const mongoose = require('mongoose');

const abilitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  level: { type: Number, required: true },
  turnCount: { type: Number, required: true },
  mod: { type: Number, required: true },
  passive: { type: Boolean, default: false },
  stat: {
    type: String,
    enum: ['str', 'int', 'wis', 'dex', 'cha', 'con', 'hp', 'armour'],
    required: true
  }
}, { _id: false });

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  abilities: [abilitySchema],
  highTwoStats: [{
    type: String,
    enum: ['str', 'int', 'wis', 'dex', 'cha', 'con']
  }]
});

module.exports = mongoose.model('GameClass', classSchema);
