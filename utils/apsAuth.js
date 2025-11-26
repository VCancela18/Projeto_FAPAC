const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, APS_AUTH_URL } = process.env;

// O endpoint de token (Auth 3-Legged) é fixo, mas a URL do token pode mudar
const TOKEN_URL = APS_AUTH_URL || 'https://developer.api.autodesk.com/authentication/v2/token';

/**
 * 1. Constrói e redireciona o utilizador para a página de autorização do Autodesk.
 * @param {string[]} scopes - Permissões solicitadas (ex: ['data:read', 'viewables:read']).
 * @returns {string} - URL de redirecionamento.
 */
function getAuthorizationUrl(scopes) {
    // Escopos mínimos para o projeto (leitura de dados e visualização)
    const scopeString = scopes.join(' ');
    const authUrl = 'https://developer.api.autodesk.com/authentication/v1/authorize';

    return `${authUrl}?response_type=code&client_id=${APS_CLIENT_ID}&redirect_uri=${APS_CALLBACK_URL}&scope=${scopeString}`;
}

/**
 * 2. Troca o código de autorização (obtido após login do utilizador) por um Access Token.
 * @param {string} code - Código de autorização.
 * @returns {object} - Objeto com access_token, refresh_token, etc.
 */
async function getAccessToken(code) {
    const body = new URLSearchParams({
        client_id: APS_CLIENT_ID,
        client_secret: APS_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: APS_CALLBACK_URL
    });

    const response = await fetch(TOKEN_URL, {
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
 * 3. Obtém o Access Token de 2 pernas (Server-to-Server).
 * Usado para operações de backend onde não há utilizador (ex: Webhooks).
 * @returns {string} - Access Token.
 */
async function getInternalToken(scopes = ['data:read', 'bucket:read']) {
    const scopeString = scopes.join(' ');

    const body = new URLSearchParams({
        client_id: APS_CLIENT_ID,
        client_secret: APS_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: scopeString
    });

    const response = await fetch(TOKEN_URL, {
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