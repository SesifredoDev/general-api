const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const you2Controller  =  require('../controllers/you2Controller');

router.post('/entry', verifyToken,  you2Controller.newEntry)