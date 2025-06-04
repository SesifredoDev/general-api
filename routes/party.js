const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/create', verifyToken, partyController.createParty);
router.post('/join', verifyToken, partyController.joinParty);
router.post('/leave', verifyToken, partyController.leaveParty);
router.post('/update', verifyToken, partyController.updateParty);
router.get('/:partyId', verifyToken, partyController.getParty);

module.exports = router;
