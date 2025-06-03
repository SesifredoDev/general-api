const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/user/:id', verifyToken, authController.getUserById); // New endpoint
router.get('/user-by-username/:username', userController.getUserByUsername);

module.exports = router;
