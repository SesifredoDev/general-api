const mongoose = require('mongoose');
const { effectSchema, raritySchema } = require('./actionSchema');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  icon: String,
  effect: effectSchema,
  rarity: raritySchema,
  charges: { type: Number, default: 0 }
});

module.exports = mongoose.model('Item', itemSchema);
