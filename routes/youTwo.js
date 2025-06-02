const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const youTwoController  =  require('../controllers/youTwoController');

router.post('/entry', verifyToken,  youTwoController.newEntry)