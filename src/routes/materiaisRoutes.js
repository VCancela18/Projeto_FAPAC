const express = require('express');
const router = express.Router();
const { getMateriais, getMaterialById } = require('../controllers/AirTableConroller');

// GET todos os materiais
router.get('/', async (req, res) => {
  try {
    const materiais = await getMateriais();
    res.json(materiais);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET material por ID
router.get('/:id', async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
