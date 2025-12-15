// src/routes/materiaisRoutes.js

const express = require('express');
const router = express.Router();
const { getMateriais, getMaterialById } = require('../controllers/AirTableController');

// GET /api/materiais
router.get('/', getMateriais);
// GET /api/materiais/:id
router.get('/:id', getMaterialById);

module.exports = router;
