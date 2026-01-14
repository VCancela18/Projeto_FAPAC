const express = require('express');
const router = express.Router();
const controller = require('../controllers/AirTableController');

// Rota para Ler (GET /api/materiais)
router.get('/', controller.getMateriais);

// Rota para Criar (POST /api/materiais)
router.post('/', controller.createMaterial);

// Rota para Apagar (DELETE /api/materiais/:id)
router.delete('/:id', controller.deleteMaterial);

module.exports = router;