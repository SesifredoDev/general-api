const {ItemSchema}  = require('./itemModel');
const {WeaponSchema} = require('./weaponModel');
const {SpellSchema} =  require('./spellModel')
const mongoose = require('mongoose');

const StarterPackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  weapons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Weapon' }],
  spells: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Spell' }]
});

module.exports = mongoose.model('StarterPack', StarterPackSchema);
