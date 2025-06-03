const mongoose = require('mongoose');

const statBlockSchema = new mongoose.Schema({
  slug: { type: String, enum: ["str", "int", "wis", "dex", "cha", "con"], required: true },
  name: String,
  level: Number,
  xp: Number,
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: String,
  icon: String,
  level: Number,
  class: String,
  type:Number,
  xp:Number,
  stats: {
    str: statBlockSchema,
    int: statBlockSchema,
    wis: statBlockSchema,
    dex: statBlockSchema,
    cha: statBlockSchema,
    con: statBlockSchema,
  },
  lastEntry:String,
  refreshTokens: [String],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});



module.exports = mongoose.model('User', userSchema);
