
const User = require('../models/userModel');
const predict = require("../rpgML/predict");
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


exports.newEntry = async (req, res) => {
  const { input, id } = req.body;

  try {
    const user = await User.findById(id).select('-password');
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

    // Accumulate XP
    predictionResults.forEach(prediction => {
      const rawKey = prediction?.predictedStat;
      if (typeof rawKey === 'string') {
        const statKey = rawKey.toLowerCase();
        if (changes[statKey]) {
          changes[statKey].xp += Math.round(prediction.predictedDifficulty || 0);
        }
      }
    });

    // Apply XP and handle stat level internally
    for (const key in changes) {
      const newXP = user.stats[key].xp + changes[key].xp;
      user.stats[key].xp = newXP;

      // Optional: update stat level if desired, even if not returned
      user.stats[key].level = Math.floor(newXP / 1000).toString();
    }

    // Total user XP across all stats
    const totalXP = Object.values(user.stats).reduce((acc, stat) => acc + stat.xp, 0);
    const newUserLevel = Math.floor(totalXP / 6000);
    const userLevelUps = newUserLevel - user.level;

    user.level = newUserLevel;
    user.lastEntry = new Date();

    await user.save();

    const result = {
      user,
      changes,
      origins: originalStats,
      ...(userLevelUps > 0 && {
        levelUp: {
          count: userLevelUps
        }
      })
    };

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid ID format or server error' });
  }
};
