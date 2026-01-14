const APS_API_URL = process.env.APS_API_URL;

// Função Auxiliar
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

// Rota APS: /project/v1/hubs/:hub_id/projects
exports.getProjects = async (req, res, next) => {
  const { hub_id } = req.params;
  // Usar o token injetado pelo middleware
  const accessToken = req.accessToken;

  try {
    const projects = await callApsApi(`/project/v1/hubs/${hub_id}/projects`, accessToken);
    res.json(projects);
  } catch (error) {
    next(error); // Passa o erro para o middleware global
  }
};