const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const youTwoController  =  require('../controllers/youTwoController');
const avatarController = require('../controllers/avatarController')

router.get('/train', youTwoController.train);
router.post('/entry', verifyToken,  youTwoController.newEntry);
router.post('/avatar', verifyToken, avatarController.updateAvatar );

module.exports  =  router;