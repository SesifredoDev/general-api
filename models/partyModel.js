const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  name: { type: String, required: true },
  manager:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joinCode: { type: String, required: true, unique: true },
  level: { type: Number, default: 1 },
  icon: { type: String, default: '' }, // ✅ Add this line
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
module.exports = mongoose.model('Party', partySchema);
