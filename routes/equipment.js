const express = require('express');
const router = express.Router();
const controller = require('../controllers/equipmentController');
const Weapon = require('../models/weaponModel');
const Spell = require('../models/spellModel');
const Item = require('../models/itemModel');

// Weapons
router.get('/weapons', controller.getAll(Weapon));
router.get('/weapons/random', controller.getRandom(Weapon));
router.get('/weapons/:id', controller.getById(Weapon));
router.post('/weapons', controller.addNew(Weapon));
router.put('/weapons/:id', controller.updateItem(Weapon));

// Spells
router.get('/spells', controller.getAll(Spell));
router.get('/spells/random', controller.getRandom(Spell));
router.get('/spells/:id', controller.getById(Spell));
router.post('/spells', controller.addNew(Spell));
router.put('/spells/:id', controller.updateItem(Spell));

// Items
router.get('/items', controller.getAll(Item));
router.get('/items/random', controller.getRandom(Item));
router.get('/items/:id', controller.getById(Item));
router.post('/items', controller.addNew(Item));
router.put('/items/:id', controller.updateItem(Item));


router.post('/weapons/batch', controller.addBatch(Weapon));
router.post('/spells/batch', controller.addBatch(Spell));
router.post('/items/batch', controller.addBatch(Item));



// Packs
router.get('/packs', controller.getStarterPacks);
router.post('/packs/select', controller.selectStarterPack);

// Admin route
router.post('/packs', controller.addStarterPack);

module.exports = router;
