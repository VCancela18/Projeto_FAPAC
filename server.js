const dotenv = require('dotenv');
const path = require('path');
const express = require('express');

dotenv.config();

const app = require('./app');
const PORT = process.env.PORT || 3000;

// --- SERVIDOR SIMPLES ---

// Serve os ficheiros estáticos (CSS, JS, Imagens) da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página do IFC Viewer
app.get('/ifc-viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'ifc.html'));
});

// Arrancar
app.listen(PORT, () => {
    console.log(`✅ Servidor a correr na porta ${PORT}`);
});