// src/routes/materiaisRoutes.js

const express = require('express');
const router = express.Router();
const airtableController = require('../controllers/AirtableController');

// A rota final fica: GET /api/materiais
router.get('/', airtableController.getMaterials);

module.exports = router;
