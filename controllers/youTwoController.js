const User = require('../models/userModel');
const predict = require("../rpgML/predict");
const train = require("../rpgML/train");
const rpgUtil = require("../rpgML/utils");
const Weapon = require('../models/weaponModel');
const Spell = require('../models/spellModel');
const Item = require('../models/itemModel');
const fs = require('fs');
const path = require('path');
const { processUserEquipment } = require('./equipmentController')
const dicePath = path.join(__dirname, '../assets/dice.json');

// Load dice table once
let diceTable = [];
try {
  const rawData = fs.readFileSync(dicePath);
  diceTable = JSON.parse(rawData);
} catch (err) {
  console.error('Failed to load dice.json:', err);
}

function isSameDay(dateToCheck) {
  const today = new Date();
  const checkDate = new Date(dateToCheck);

  return (
    today.getFullYear() === checkDate.getFullYear() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getDate() === checkDate.getDate()
  );
}

exports.train = async (req, res) => {
  train.train();
  res.send('training now..');
};

exports.newEntry = async (req, res) => {
  const { input, id } = req.body;
  console.log(input)
  try {
    let user = await User.findById(id)
      .populate('class')  // This ensures full GameClass data
      .populate('weapons')
      .populate('spells')
      .populate('items')
      .select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });


    if (isSameDay(user.lastEntry)) {
      return res.status(403).json({ message: 'Cannot make 2 entries on the same day.' });
    }


    const predictionResults = await rpgUtil.predictParagraph(user.type, input);

    const cleanStat = stat => ({
      slug: stat.slug,
      name: stat.name,
      level: stat.level,
      xp: 0
    });

    const changes = {
      str: cleanStat(user.stats.str),
      int: cleanStat(user.stats.int),
      wis: cleanStat(user.stats.wis),
      dex: cleanStat(user.stats.dex),
      cha: cleanStat(user.stats.cha),
      con: cleanStat(user.stats.con),
    };

    const originalStats = JSON.parse(JSON.stringify(user.stats));

    let userXP = user.xp || 0;
    let changeXP = 0;
    let userLevelUpCount = 0;

    // Accumulate XP to each stat based on predictions
    predictionResults.forEach(prediction => {
      const rawKey = prediction?.predictedStat;
      if (typeof rawKey === 'string') {
        const statKey = rawKey.toLowerCase();
        if (changes[statKey]) {
          changes[statKey].xp += Math.round(prediction.predictedDifficulty || 0);
        }
        changeXP += Math.round(prediction.predictedDifficulty || 0);
      }
    });

    // Apply XP and handle stat level ups
    for (const key in changes) {
      const stat = user.stats[key];
      const totalXP = stat.xp + changes[key].xp;

      let newLevel = parseInt(stat.level, 10);
      let newXP = totalXP;

      while (newXP >= 1000) {
        newLevel += 1;
        newXP -= 1000;
      }

      stat.xp = newXP;
      stat.level = newLevel;
    }




    // User Level Ups
    userXP += changeXP;
    while (userXP >= 6000) {
      userLevelUpCount += 1;
      userXP -= 6000;
    }


    user.level = user.level + userLevelUpCount;
    user.xp = userXP;
    user.lastEntry = new Date();
    user.steak += 1;

    let classAssigned = null;

    const stats = user.stats;

    if (user.level >= 2  && userLevelUpCount >=1) {
      const statPairs = Object.entries(stats).map(([key, value]) => ({
        key,
        level: value.level,
        xp: value.xp
      }));
      user.abilities = [];

      statPairs.sort((a, b) => (b.level - a.level) || (b.xp - a.xp));
      const topTwo = [statPairs[0].key, statPairs[1].key];

      const ClassModel = require('../models/classModel');
      const foundClass = await ClassModel.findOne({
        highTwoStats: { $all: topTwo }
      });
      user.class= foundClass._id;

        classAssigned = {
          name: foundClass.name,
          description: foundClass.description
        };     

    }

    user.save();
    
    user = await User.findById(id)
      .populate('class')  // This ensures full GameClass data
      .populate('weapons')
      .populate('spells')
      .populate('items')
      .select('-password');

    // Try to get a random reward
    const reward = await tryGrantReward(user);
     // now includes added item if any
    
    const classAppliedFeatures = applyClassAbilities(user);
    console.log(classAppliedFeatures);
    if (userLevelUpCount >= 1) {
        user.armour = 5+ parseAndRollDiceExpression(getDiceExpressionByValue(classAppliedFeatures.stats.str.level + user.level + classAppliedFeatures.armourBonus));
        user.hp = 5+ (parseAndRollDiceExpression(getDiceExpressionByValue(classAppliedFeatures.stats.str.level + user.level)) + classAppliedFeatures.hpBonus);
        user.evasion = 3+  (parseAndRollDiceExpression(getDiceExpressionByValue(classAppliedFeatures.stats.dex.level)))
    }
    await user.save(); 
    const finalUser = processUserEquipment(user.toObject());
    const result = {
      user: finalUser,
      changes,
      origins: originalStats,
      ...(userLevelUpCount > 0 && {
        levelUp: {
          count: userLevelUpCount
        }
      }),
      ...(reward && {
        reward: {
          type: reward.type,
          item: reward.data
        }
      }),
      ...(classAssigned && {
        classAssigned
      })
    };


    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid ID format or server error' });
  }
};



exports.sendFriendRequest = async (req, res) => {
  const { fromId, toId } = req.body;

  if (fromId === toId) return res.status(400).json({ message: 'Cannot add yourself' });

  const fromUser = await User.findById(fromId);
  const toUser = await User.findById(toId);

  if (!fromUser || !toUser) return res.status(404).json({ message: 'User not found' });

  if (toUser.friendRequests.includes(fromId) || toUser.friends.includes(fromId))
    return res.status(400).json({ message: 'Friend request already sent or already friends' });

  toUser.friendRequests.push(fromId);
  await toUser.save();

  res.json({ message: 'Friend request sent' });
};


exports.acceptFriendRequest = async (req, res) => {
  const { userId, requesterId } = req.body;

  const user = await User.findById(userId);
  const requester = await User.findById(requesterId);

  if (!user || !requester) return res.status(404).json({ message: 'User not found' });

  if (!user.friendRequests.includes(requesterId))
    return res.status(400).json({ message: 'No friend request from this user' });

  user.friendRequests = user.friendRequests.filter(id => id.toString() !== requesterId);
  user.friends.push(requesterId);
  requester.friends.push(userId);

  await user.save();
  await requester.save();

  res.json({ message: 'Friend request accepted' });
};
exports.getFriends = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).populate('friends', 'username avatar icon stats level class');
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json(user.friends);
};



function applyClassAbilities(userObj) {
  let stats = userObj.stats;
  let spells = userObj.spells;
  let weapons  = userObj.weapons
  let hpBonus = 0;
  let armourBonus = 0;
  
  if (!userObj.class?.abilities) return {
    hpBonus,
    armourBonus,
    stats,
    spells,
    weapons,
  };

  userObj.abilities ??= [];

  for (const ability of userObj.class.abilities) {
    if (userObj.level >= ability.level) {
      const alreadyHas = userObj.abilities.some(a => a.name === ability.name);
      if (!alreadyHas) {
        userObj.abilities.push(ability);
      }

      if (ability.passive) {
        const mod = ability.mod || 0;
        const statKey = ability.stat;

        if (stats[statKey]) {
          stats[statKey].level += mod;
        } else if (statKey === 'hp') {
          hpBonus += mod;
        } else if (statKey === 'armour') {
          armourBonus += mod;
        }
      }
    }
  }

  return {
    hpBonus,
    armourBonus,
    stats: { ...stats }, // return a shallow copy to avoid unintended mutation,
    spells:{...spells},
    weapons: {...weapons},
    
  };
}



function getDiceExpressionByValue(value) {
  const dicePath = path.join(__dirname, '../assets/dice.json');

  let diceTable;
  try {
    const rawData = fs.readFileSync(dicePath, 'utf-8');
    diceTable = JSON.parse(rawData);
  } catch (err) {
    console.error('Error reading dice.json:', err);
    return null;
  }

  const match = diceTable.find(entry => entry.value === value);
  return match ? match.dice : "3d20";
}
function parseAndRollDiceExpression(expression) {
  const tokens = expression.replace(/\s+/g, '').match(/[\d]*d\d+|\d+|[+-]/gi);
  if (!tokens) {
    throw new Error(`Invalid dice expression: ${expression}`);
  }

  let total = 0;
  let rolls = [];
  let currentOperator = '+';

  for (let token of tokens) {
    if (token === '+' || token === '-') {
      currentOperator = token;
      continue;
    }

    let value = 0;
    let individualRolls = [];

    if (token.includes('d')) {
      const [countStr, sidesStr] = token.toLowerCase().split('d');
      const count = parseInt(countStr) || 1;
      const sides = parseInt(sidesStr);

      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        individualRolls.push(roll);
        value += roll;
      }
    } else {
      value = parseInt(token);
      individualRolls.push(value);
    }

    total = currentOperator === '+' ? total + value : total - value;

    rolls.push({
      token,
      operator: currentOperator,
      rolls: individualRolls,
      value
    });
  }

  return total
}


// Select item based on rarity
function getRandomByRarity(list) {
  const total = list.reduce((sum, obj) => sum + (obj.rarity?.percentage || 0), 0);
  const rand = Math.random() * total;
  let cumulative = 0;

  for (const obj of list) {
    cumulative += obj.rarity?.percentage || 0;
    if (rand <= cumulative) return obj;
  }

  return null;
}

// ~20% chance to get a reward
async function tryGrantReward(user) {
  const roll = Math.random();
  if (roll > 0.2) return null;

  const types = ['weapon', 'spell', 'item'];
  const chosenType = types[Math.floor(Math.random() * types.length)];

  if (chosenType === 'weapon') {
    const weapons = await Weapon.find();
    const selected = getRandomByRarity(weapons);
    if (selected) {
      user.weapons.push(selected._id);
      return { type: 'weapon', data: selected };
    }
  } else if (chosenType === 'spell') {
    const spells = await Spell.find();
    const selected = getRandomByRarity(spells);
    if (selected) {
      user.spells.push(selected._id);
      return { type: 'spell', data: selected };
    }
  } else if (chosenType === 'item') {
    const items = await Item.find();
    const selected = getRandomByRarity(items);
    if (selected) {
      user.items.push(selected._id);
      return { type: 'item', data: selected };
    }
  }

  return null;
}
