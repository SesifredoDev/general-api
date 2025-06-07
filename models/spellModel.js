const mongoose = require('mongoose');
const { actionSchema, raritySchema } = require('./actionSchema');

const spellSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  icon: String,
  actions: [actionSchema],
  rarity: raritySchema,
  charges: { type: Number, default: 0 }
});

module.exports = mongoose.model('Spell', spellSchema);
