// src/routes/forgeRoutes.js

const express = require('express');
const router = express.Router();

// Imports necessários
// Assumimos que estes controllers existem na sua estrutura
const { getAuthorizationUrl, getAccessToken, getInternalToken } = require('../utils/apsAuth'); 
const hubsController = require('../controllers/hubsController');
const projectsController = require('../controllers/projectsController');
const contentsController = require('../controllers/ContentsController');

// === MIDDLEWARE DE AUTENTICAÇÃO: SOLUÇÃO PARA O ERRO 401 ===
// Tenta gerar um token 2-legged REAL e válido se o token de usuário não existir.
async function requireAuth(req, res, next) {
    // 1. Tenta usar o token de 3 pernas (se implementado)
    let accessToken = req.internalOAuthToken ? req.internalOAuthToken.access_token : null;

    // 2. Se não houver token de usuário, gera um token 2-legged válido
    if (!accessToken) {
        try {
            // Isto resolve o 401, pois injeta um token válido, em vez do APS_CLIENT_SECRET.
            accessToken = await getInternalToken(['data:read', 'viewables:read']);
        } catch (err) {
            console.error("ERRO CRÍTICO: Falha ao obter token 2-legged. Verifique as chaves APS no .env", err);
            return res.status(500).json({ ok: false, error: 'Falha na autenticação interna do servidor APS.' });
        }
    }

    // Injeta o token válido (3-legged ou 2-legged) no req para os controllers
    req.accessToken = accessToken;
    next();
}

// === ROTAS DE AUTENTICAÇÃO (OAuth 3-Legged) ===
router.get('/api/auth/login', (req, res) => {
    const scopes = ['data:read', 'viewables:read']; 
    res.redirect(getAuthorizationUrl(scopes));
});

router.get('/api/auth/callback', async (req, res, next) => {
    const code = req.query.code;
    
    if (!code) {
        return res.redirect('/'); 
    }

    try {
        const tokenData = await getAccessToken(code);
        // O tokenData.access_token é válido. Em um app real, seria guardado na sessão.
        
        // Redireciona para o frontend após o callback (para o JS detectar o token)
        res.redirect('/');
        
    } catch (error) {
        next(error);
    }
});

router.get('/api/auth/token', requireAuth, (req, res) => {
    // Retorna o token que foi injetado pelo middleware 'requireAuth'
    res.json({ access_token: req.accessToken }); 
});


// === ROTAS DE DATA MANAGEMENT (DM) - REQUEREM requireAuth ===
router.get('/api/dm/hubs', requireAuth, hubsController.getHubs);
router.get('/api/dm/hubs/:hub_id/projects', requireAuth, projectsController.getProjects);
// Assumindo que contentsController.js exporta as funções
router.get('/api/dm/hubs/:hub_id/projects/:project_id/contents', requireAuth, contentsController.getTopFolders);
router.get('/api/dm/folders/:project_id/:folder_id/contents', requireAuth, contentsController.getFolderContents);
router.get('/api/dm/items/:project_id/:item_id/versions', requireAuth, contentsController.getItemVersions);


module.exports = router;    