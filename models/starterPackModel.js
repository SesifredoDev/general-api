const mongoose = require('mongoose');
const {ItemSchema}  = require('./itemModel');
const {WeaponSchema} = require('./weaponModel');
const {SpellSchema} =  require('./spellModel')

const StarterPackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  items: [ItemSchema],
  weapons: [WeaponSchema], 
  spells: [SpellSchema] 
});


module.exports = mongoose.model('StarterPack', StarterPackSchema);