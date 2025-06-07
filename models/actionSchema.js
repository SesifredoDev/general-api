const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  actionCount: { type: Number, enum: [1, 2, 3], required: true },
  range: { type: Number, required: true },
  AoE: { type: Number, required: true },
  stat: { type: String, enum: ['str', 'int', 'wis', 'dex', 'cha', 'con'] },
  save: { type: String, enum: ['str', 'int', 'wis', 'dex', 'cha', 'con'] },
  flatNumber: Number,
  mod: { type: Number, required: true },
  type: { type: String, enum: ['pos', 'neg'], required: true }
}, { _id: false });

const effectSchema = new mongoose.Schema({
  ...actionSchema.obj,
  turnCount: { type: Number, required: true }
}, { _id: false });

const raritySchema = new mongoose.Schema({
  name: { type: String, required: true },
  percentage: { type: Number, required: true }
}, { _id: false });

module.exports = {
  actionSchema,
  effectSchema,
  raritySchema
};
