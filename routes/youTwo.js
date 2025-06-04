const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const youTwoController  =  require('../controllers/youTwoController');
const avatarController = require('../controllers/avatarController')
const partyController = require('../controllers/partyController');

router.get('/train', youTwoController.train);
router.post('/entry', verifyToken,  youTwoController.newEntry);
router.post('/avatar', verifyToken, avatarController.updateAvatar );

router.post('/friend-request',verifyToken, youTwoController.sendFriendRequest);
router.post('/accept-friend', verifyToken,youTwoController.acceptFriendRequest);
router.get('/:userId/friends',verifyToken, youTwoController.getFriends);



router.post('/party/create', verifyToken, partyController.createParty);
router.post('/party/join', verifyToken, partyController.joinParty);
router.post('/party/leave', verifyToken, partyController.leaveParty);
router.post('/party/update', verifyToken, partyController.updateParty);
router.get('/party/:partyId', verifyToken, partyController.getParty);



module.exports  =  router;