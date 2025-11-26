// src/controllers/contentsController.js

const APS_API_URL = process.env.APS_API_URL;

// Função Auxiliar (Repetida - idealmente estaria num ficheiro utilitário)
async function callApsApi(endpoint, accessToken) {
    const response = await fetch(`${APS_API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`APS API failed with status ${response.status}: ${errorText.substring(0, 100)}`);
        error.status = response.status;
        throw error;
    }

    return response.json();
}


// --- 1. LISTAR PASTAS DE NÍVEL SUPERIOR (TOP FOLDERS) ---
// Rota APS: /project/v1/hubs/:hub_id/projects/:project_id/topFolders
exports.getTopFolders = async (req, res, next) => {
  const { hub_id, project_id } = req.params;
  const accessToken = req.accessToken;

  try {
    [cite_start]// CORREÇÃO: Usar o endpoint correto para Top Folders [cite: 524]
    const endpoint = `/project/v1/hubs/${hub_id}/projects/${project_id}/topFolders`;
    const contents = await callApsApi(endpoint, accessToken);
    res.json(contents);
  } catch (error) {
    next(error);
  }
};


// --- 2. LISTAR CONTEÚDO DE UMA PASTA ESPECÍFICA ---
exports.getFolderContents = async (req, res, next) => {
    // project_id é necessário para a URL da API, mesmo que folder_id identifique a pasta
    const { project_id, folder_id } = req.params;
    const accessToken = req.accessToken;

    try {
        const endpoint = `/data/v1/projects/${project_id}/folders/${folder_id}/contents`;
        const contents = await callApsApi(endpoint, accessToken);
        res.json(contents);
    } catch (error) {
        next(error);
    }
};


// --- 3. LISTAR VERSÕES DE UM ITEM ---
exports.getItemVersions = async (req, res, next) => {
    const { project_id, item_id } = req.params;
    const accessToken = req.accessToken;

    try {
        const endpoint = `/data/v1/projects/${project_id}/items/${item_id}/versions`;
        const versions = await callApsApi(endpoint, accessToken);
        res.json(versions);
    } catch (error) {
        next(error);
    }
};
// EXPORTAÇÃO ALTERADA: Exportar todas as funções
module.exports = {
    getTopFolders: exports.getTopFolders,
    getFolderContents: exports.getFolderContents,
    getItemVersions: exports.getItemVersions
};