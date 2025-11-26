// src/controllers/hubsController.js

const APS_API_URL = process.env.APS_API_URL;

// Função Auxiliar para Chamadas APS (Movida para utils/apsUtils.js futuramente)
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

// Rota APS: /project/v1/hubs
exports.getHubs = async (req, res, next) => {
  // CORREÇÃO: Usar o token injetado pelo middleware
  const accessToken = req.accessToken;

  try {
    const hubs = await callApsApi('/project/v1/hubs', accessToken);
    res.json(hubs);
  } catch (error) {
    next(error); // Passa o erro para o middleware global
  }
};