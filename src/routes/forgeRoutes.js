// src/routes/forgeRoutes.js

const express = require('express');
const router = express.Router();

// Importar Utils e Controllers
const { getAuthorizationUrl, getAccessToken } = require('../../utils/apsAuth');
const { getHubs } = require('../controllers/hubsController');
const { getProjects } = require('../controllers/projectsController');
const { getTopFolders, getFolderContents, getItemVersions } = require('../../../Projeto_FAPAC/src/controllers/contentsController');


// === MIDDLEWARE DE AUTENTICAÇÃO ===
// Este middleware verifica se há um token de utilizador (deve ser persistido em sessão/cookies)
// Aqui vamos injetar um token de 2 pernas TEMPORÁRIO para testes, até a lógica de sessão estar pronta.
function requireAuth(req, res, next) {
    // Simulação: Na ausência de um sistema de sessão que armazene o token de 3 pernas,
    // vamos usar o token de 2 pernas (APS_CLIENT_SECRET) APENAS para continuar os testes de desenvolvimento.
    // ESTA LINHA DEVE SER SUBSTITUÍDA PELO ACESSO AO TOKEN DE SESSÃO REAL!
    // Exemplo de como um boilerplate injeta o token: req.internalOAuthToken.access_token
    const accessToken = process.env.APS_CLIENT_SECRET; // MUDAR DEPOIS

    if (!accessToken) {
        return res.status(401).json({ ok: false, error: 'Authorization required. Please log in.' });
    }
    // Injeta o access_token no req para que os controllers possam usá-lo diretamente
    req.accessToken = accessToken;
    next();
}


// === ROTAS DE AUTENTICAÇÃO (OAuth 3-Legged) ===

// 1. Inicia o fluxo de login (redirecionamento para Autodesk)
router.get('/api/auth/login', (req, res) => {
    // Solicitamos os escopos mínimos necessários para navegar e visualizar
    const scopes = ['data:read', 'viewables:read'];
    res.redirect(getAuthorizationUrl(scopes));
});

// 2. Recebe o código de autorização do Autodesk e troca-o por um token
router.get('/api/auth/callback', async (req, res, next) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Authorization code missing');
    }

    try {
        const tokenData = await getAccessToken(code);

        // Em um projeto real, aqui você armazenaria tokenData (incluindo access_token, refresh_token)
        // em uma sessão ou cookie seguro e redirecionaria para o frontend.

        // Por enquanto, apenas retornamos o token para a consola/verificação.
        res.json({
            message: 'Authentication successful. Token obtained.',
            token: tokenData
        });
    } catch (error) {
        next(error);
    }
});

// Rota auxiliar para o Frontend obter o token (que deve ser o real da sessão)
router.get('/api/auth/token', requireAuth, (req, res) => {
    // Retorna o token que foi injetado pelo middleware 'requireAuth'
    res.json({ access_token: req.accessToken });
});


// === ROTAS DE DATA MANAGEMENT (DM) ===
// APLICAÇÃO DO MIDDLEWARE requireAuth EM TODAS AS ROTAS

router.get('/api/dm/hubs', requireAuth, getHubs);
router.get('/api/dm/hubs/:hub_id/projects', requireAuth, getProjects);
router.get('/api/dm/hubs/:hub_id/projects/:project_id/contents', requireAuth, getTopFolders);
router.get('/api/dm/folders/:project_id/:folder_id/contents', requireAuth, getFolderContents);
router.get('/api/dm/items/:project_id/:item_id/versions', requireAuth, getItemVersions);


module.exports = router;