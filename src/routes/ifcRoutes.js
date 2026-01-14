const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// --- CONFIGURAÇÃO ---
// Define onde os teus ficheiros .ifc estão guardados.
const modelsDirectory = path.join(__dirname, '../public/models');

/**
 * GET /api/ifc/files
 * Retorna a lista de todos os ficheiros .ifc encontrados na pasta 'public/models'
 */
router.get('/files', (req, res) => {
    // Verificar se a pasta existe
    if (!fs.existsSync(modelsDirectory)) {
        // Se não existir, tentamos criar ou apenas avisamos
        console.warn(`[Aviso] A pasta ${modelsDirectory} não existe. A criar...`);
        try {
            fs.mkdirSync(modelsDirectory, { recursive: true });
        } catch (err) {
            return res.status(500).json({ error: "Erro ao aceder à pasta de modelos." });
        }
    }

    // Ler os ficheiros
    fs.readdir(modelsDirectory, (err, files) => {
        if (err) {
            console.error("Erro ao ler pasta:", err);
            return res.status(500).json({ error: "Não foi possível listar os ficheiros." });
        }

        // Filtrar apenas ficheiros .ifc e formatar os dados
        const ifcFiles = files
            .filter(file => file.toLowerCase().endsWith('.ifc'))
            .map(file => {
                const filePath = path.join(modelsDirectory, file);
                const stats = fs.statSync(filePath);

                return {
                    name: file,
                    size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB', // Tamanho em MB
                    date: stats.mtime.toISOString().split('T')[0], // Data da última modificação
                    url: `/models/${file}` // Link público para o visualizador carregar
                };
            });

        res.json(ifcFiles);
    });
});

/**
 * GET /api/ifc/metadata/:filename
 * Retorna dados simulados sobre um ficheiro específico
 */
router.get('/metadata/:filename', (req, res) => {
    const filename = req.params.filename;

    res.json({
        file: filename,
        status: "available",
        processed: true,
        info: "Modelo IFC detetado no sistema local."
    });
});

module.exports = router;