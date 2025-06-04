const Party = require('../models/partyModel');
const User = require('../models/userModel');
const crypto = require('crypto');

exports.createParty = async (req, res) => {
  const { name, icon, userId } = req.body;

  const user = await User.findById(userId);
  console.log(user)
  if (!user || user.party) {
    return res.status(400).json({ message: 'User already in a party or not found' });
  }

  const joinCode = crypto.randomBytes(4).toString('hex');

  const party = new Party({
    name,
    icon, // ✅ Include the icon here
    joinCode,
    users: [user._id],
  });

  await party.save();

  user.party = party._id;
  await user.save();

  const populatedParty = await Party.findById(party._id).populate('users', 'username avatar stats level class');

  res.status(201).json({ message: 'Party created', party: populatedParty, user: user });
};

exports.joinParty = async (req, res) => {
  const { userId, joinCode } = req.body;

  const user = await User.findById(userId);
  if (!user || user.party) {
    return res.status(400).json({ message: 'User already in a party or not found' });
  }

  const party = await Party.findOne({ joinCode });
  if (!party) return res.status(404).json({ message: 'Party not found' });

  if (party.users.length >= 7) {
    return res.status(403).json({ message: 'Party is full' });
  }

  party.users.push(user._id);
  await party.save();

  user.party = party._id;
  await user.save();

  const populatedParty = await Party.findById(party._id).populate('users', 'username avatar stats level class');

  res.json({ message: 'Joined party', party: populatedParty, user });
};

exports.leaveParty = async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.party) {
    return res.status(400).json({ message: 'User is not in a party or not found' });
  }

  const party = await Party.findById(user.party);
  if (!party) return res.status(404).json({ message: 'Party not found' });

  party.users = party.users.filter(id => id.toString() !== userId);
  await party.save();

  user.party = null;
  await user.save();

  res.json({ message: 'Left party' });
};

exports.updateParty = async (req, res) => {
  const { partyId, name, level } = req.body;

  const party = await Party.findById(partyId);
  if (!party) return res.status(404).json({ message: 'Party not found' });

  if (name) party.name = name;
  if (typeof level === 'number') party.level = level;

  await party.save();

  res.json({ message: 'Party updated', party });
};

exports.getParty = async (req, res) => {
  const { partyId } = req.params;

  const party = await Party.findById(partyId).populate('users', 'username avatar level class stats');
  if (!party) return res.status(404).json({ message: 'Party not found' });

  // ✅ Calculate average level
  if (party.users.length > 0) {
    const totalLevel = party.users.reduce((sum, user) => sum + (user.level || 0), 0);
    party.level = Math.floor(totalLevel / party.users.length);
  } else {
    party.level = 1; // fallback if no users
  }

  // ✅ Save updated party level
  await party.save();

  res.json(party);
};
