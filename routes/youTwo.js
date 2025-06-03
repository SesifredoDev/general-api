const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const youTwoController  =  require('../controllers/youTwoController');
const avatarController = require('../controllers/avatarController')

router.get('/train', youTwoController.train);
router.post('/entry', verifyToken,  youTwoController.newEntry);
router.post('/avatar', verifyToken, avatarController.updateAvatar );

router.post('/friend-request',verifyToken, youTwoController.sendFriendRequest);
router.post('/accept-friend', verifyToken,youTwoController.acceptFriendRequest);
router.get('/:userId/friends',verifyToken, youTwoController.getFriends);


module.exports  =  router;