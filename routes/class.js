const express = require('express');
const router = express.Router();
const controller = require('../controllers/classController');

// GET all classes
router.get('/', controller.getAllClasses);

// POST batch of new classes
router.post('/batch', controller.addBatchClasses);


router.post('/add-abilities', controller.addAbilitiesToClass);


module.exports = router;
