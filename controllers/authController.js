const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.register = async (req, res) => {
  const { username, name, email, password } = req.body;
  console.log(req.body)
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);

  let stats =  {
    str:{
      slug: "str",
      name: "Strength",
      level: 1,
      xp: 0,
    },
    int:{
      slug: "int",
      name: "Intelligence",
      level: 1,
      xp: 0,
    },
    wis:{
      slug: "wis",
      name: "Wisdom",
      level: 1,
      xp: 0,
    },
    dex:{
      slug: "dex",
      name: "Dexterity",
      level: 1,
      xp: 0,
    },
    cha:{
      slug: "cha",
      name: "Charisma",
      level: 1,
      xp: 0,
    },
    con:{
      slug: "con",
      name: "Constitution",
      level: 1,
      xp: 0,
    }
  }

  const newUser = new User({
    username,
    name,
    email,
    password: hashedPassword,
    avatar: "",
    icon:  "",
    stats
  });

  await newUser.save();
  res.status(201).json({
    message: 'User created',
    userId: newUser._id
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token,
    
  userId: user._id
   });
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select('-password'); // Don't return password
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Invalid ID format' });
  }
};
