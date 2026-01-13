// app.js

// Configures Express app, middleware, and routes
const express = require('express');
const app = express();

// --- Importar Módulos ---
const forgeRoutes = require('./src/routes/forgeRoutes');
const materiaisRoutes = require('./src/routes/materiaisRoutes');
const ifcRoutes = require('./src/routes/ifcRoutes');
const errorHandler = require('./src/middleware/errorHandler'); // Importa o middleware de tratamento de erros
const logger = require('./src/middleware/logger');
const path = require('path');// Importa o middleware de log/tempo de resposta

// --- Middlewares Gerais ---

app.use(express.static(path.join(__dirname, 'public')));

// Serve web-ifc WASM directly from node_modules to make it available at /wasm/web-ifc.wasm
app.use('/wasm', express.static(path.join(__dirname, 'node_modules', 'web-ifc')));

// Ensure public/wasm/web-ifc.wasm exists by copying from node_modules if available
const fs = require('fs');
const srcWasm = path.join(__dirname, 'node_modules', 'web-ifc', 'web-ifc.wasm');
const destDir = path.join(__dirname, 'public', 'wasm');
const destWasm = path.join(destDir, 'web-ifc.wasm');
try {
    if (fs.existsSync(srcWasm)) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        if (!fs.existsSync(destWasm)) {
            fs.copyFileSync(srcWasm, destWasm);
            console.log('Web-IFC WASM copiado para public/wasm/web-ifc.wasm');
        } else {
            console.log('public/wasm/web-ifc.wasm já existe');
        }
    } else {
        console.warn('web-ifc.wasm não encontrado em node_modules/web-ifc. Executa `npm install` para obter o ficheiro WASM.');
    }
} catch (e) {
    console.warn('Erro ao tentar copiar web-ifc.wasm:', e);
}
// Middleware para processar payloads JSON
app.use(express.json());

// Middleware de Log/Tempo de Resposta
app.use(logger);


// --- Definição de Rotas Gerais ---

// Rotas do seu app.js original
app.get('/', (req, res) => {
    // Serve o index original da aplicação (na pasta public/html)
    res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ status: 'active', timestamp: new Date().toISOString() });
});

app.get('/time', (req, res) => {
    res.send(new Date().toISOString());
});

app.get('/echo', (req, res) => {
    const { category, color } = req.query;
    if (!category && !color) {
        throw new Error('category or color are required');
    } else {
        res.json({ ok: true, category: category, color: color });
    }
});

app.get('/error-route', (req, res) => {
    throw new Error('Something went wrong!');
});

// Função auxiliar para rota /external
async function fetchPost(userId, limit) {
    try {
        const response = await fetch(`https://jsonplaceholder.typicode.com/posts?userId=${userId}&_limit=${limit}`);
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Failed to fetch posts');
    }
}

app.get('/external', async (req, res) => {
    const { userId = 1, limit = 5 } = req.query;

    const posts = await fetchPost(userId, limit);
    res.json({ ok: true, data: posts, params: { userId, limit } });
});

// --- Montagem das Rotas Específicas ---

// Monta as rotas da API Forge/Autodesk
app.use(forgeRoutes); // Todas as rotas do APS (incluindo Auth) vão para forgeRoutes

// Monta as rotas dos Materiais do Airtable
app.use('/api/materiais', materiaisRoutes);
// Monta as rotas do IFC Viewer (upload + viewer page)
app.use(ifcRoutes);
// --- Global Error Middleware ---

// Garante que captura erros de todas as rotas e middlewares anteriores
app.use(errorHandler);


module.exports = app;