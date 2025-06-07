const mongoose = require('mongoose');
const {ItemSchema}  = require('./itemModel');
const {WeaponSchema} = require('./weaponModel');
const {SpellSchema} =  require('./spellModel')

const StarterPackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  items: { type: [ItemSchema], default: [] },
  weapons: { type: [WeaponSchema], default: [] },
  spells: { type: [SpellSchema], default: [] }
});


module.exports = mongoose.model('StarterPack', StarterPackSchema);