const User = require('../models/userModel');

exports.updateAvatar = async (req, res) => {
    const { avatarURL, icon, id } = req.body;
    
    try {
        
        const user = await User.findById(id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        if(avatarURL.includes("readyplayer.me")){
            
            user.avatar = avatarURL;
            user.icon = icon;
            user.save();
            res.status(200).json({ message: 'Avatar Updated', url: avatarURL });

        }else{
            res.status(400).json({ message: 'Invalid Avatar URL' });
        }
    }catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid ID format or server error' });
  }
}   