const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL } = process.env;

// --- Usar os Endpoints Oficiais da API (não o site de signin) ---
const APS_BASE_URL = 'https://developer.api.autodesk.com';
const AUTHORIZE_ENDPOINT = `${APS_BASE_URL}/authentication/v2/authorize`;
const TOKEN_ENDPOINT = `${APS_BASE_URL}/authentication/v2/token`;

/**
 * Constrói e redireciona o utilizador para a página de autorização do Autodesk.
 * @param {string[]} scopes - Permissões solicitadas.
 * @returns {string} - URL de redirecionamento.
 */
function getAuthorizationUrl(scopes) {
    const scopeString = scopes.join(' ');

    // --- CORREÇÃO 2: Sintaxe correta do URL ---
    // A URL base é limpa, e o primeiro parâmetro usa '?', os seguintes usam '&'
    return `${AUTHORIZE_ENDPOINT}?response_type=code&client_id=${APS_CLIENT_ID}&redirect_uri=${APS_CALLBACK_URL}&scope=${scopeString}`;
}

/**
 * Troca o código de autorização por um Access Token.
 */
async function getAccessToken(code) {
    const body = new URLSearchParams({
        client_id: APS_CLIENT_ID,
        client_secret: APS_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: APS_CALLBACK_URL
    });

    // Usa o endpoint correto da API (v2/token)
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    });

    if (!response.ok) {
        throw new Error(`Failed to exchange code for token: ${response.status}`);
    }

    return response.json();
}

/**
 * Obtém o Access Token de 2 (Server-to-Server).
 */
async function getInternalToken(scopes = ['data:read', 'bucket:read']) {
    const scopeString = scopes.join(' ');

    const body = new URLSearchParams({
        client_id: APS_CLIENT_ID,
        client_secret: APS_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: scopeString
    });

    // Usa o endpoint correto da API (v2/token)
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    });

    if (!response.ok) {
        throw new Error(`Failed to get internal token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
}

module.exports = {
    getAuthorizationUrl,
    getAccessToken,
    getInternalToken
};