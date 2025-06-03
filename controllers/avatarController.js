const User = require('../models/userModel');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

exports.updateAvatar = async (req, res) => {
  const { avatarURL, id } = req.body;

  if (!avatarURL || !avatarURL.includes('readyplayer.me')) {
    return res.status(400).json({ message: 'Invalid Avatar URL' });
  }

  try {
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Save avatar URL
    user.avatar = avatarURL;

    // Headless browser to capture headshot
    const browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 512, height: 512 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const pagePath = path.resolve(__dirname, '../views/headshot.html'); // or use your hosted version
    const fileUrl = `file://${pagePath}?avatarUrl=${encodeURIComponent(avatarURL)}`;

    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Wait for avatar to load completely
    await page.waitForSelector('#render-complete', { timeout: 10000 });

    const screenshot = await page.screenshot({ type: 'jpeg', quality: 90, encoding: 'base64' });
    await browser.close();

    user.icon = `data:image/jpeg;base64,${screenshot}`;
    await user.save();

    res.status(200).json({ message: 'Avatar and icon updated', avatar: avatarURL, icon: user.icon });

  } catch (err) {
    console.error('Error updating avatar:', err);
    res.status(500).json({ message: 'Server error generating avatar icon' });
  }
};
