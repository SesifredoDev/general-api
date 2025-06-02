const User = require('../models/userModel');
const predict = require("../rpgML/predict");
const train = require("../rpgML/train");
const rpgUtil = require("../rpgML/utils");

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

  try {
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    let userXP = user.xp;
    let changeXP = 0;
    let userLevelUpCount = 0;  

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
    while(UserXP >= 6000){
      userLevelUpCount += 1;
      userXP -= 6000;
    }


    user.level = newUserLevel;
    user.lastEntry = new Date();

    await user.save();

    const result = {
      user,
      changes,
      origins: originalStats,
      ...(userLevelUps > 0 && {
        levelUp: {
          count: userLevelUpCount
        }
      })
    };

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid ID format or server error' });
  }
};
