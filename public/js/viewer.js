let viewer = null;
let accessToken = null;
const viewerContainer = document.getElementById('viewerContainer');
const statusIndicator = document.getElementById('statusIndicator');
const loadModelButton = document.getElementById('loadModelButton');
const urnInput = document.getElementById('urnInput');
const dataTree = document.getElementById('dataTree');
const sidebar = document.querySelector('.sidebar');

// === LÓGICA DE AUTENTICAÇÃO ===

// Inicia o fluxo de Login (Redireciona para /api/auth/login)
document.getElementById('loginButton').addEventListener('click', () => {
    // Redireciona o browser para a rota de login do backend Express
    window.location.href = '/api/auth/login';
});

// Verifica se o Access Token já está disponível
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/token');

        if (response.ok) {
            const data = await response.json();

            if (data.access_token) {
                accessToken = data.access_token;
                statusIndicator.textContent = 'Status: Autenticado';
                statusIndicator.classList.add('authenticated');
                loadModelButton.disabled = false;

                // Lançamento da Navegação
                initializeViewer();
                startNavigation();

                console.log('Access Token Obtido.');
                return true;
            }
        }
    } catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
    }

    // Se falhar ou não houver token
    statusIndicator.textContent = 'Status: Não Autenticado';
    statusIndicator.classList.remove('authenticated');
    loadModelButton.disabled = true;
    return false;
}

    // Se falhar ou não houver token
    statusIndicator.textContent = 'Status: Não Autenticado';
    statusIndicator.classList.remove('authenticated'); // REMOVIDO: Classe verde
    loadModelButton.disabled = true;
    return false;
}

// === INICIALIZAÇÃO DO VIEWER SDK ===

function initializeViewer() {
    // A função Autodesk.Viewing.Initializer é chamada uma vez
    // e configura o ambiente global do Viewer.

    var options = {
        env: 'AutodeskProduction2', // Usa o ambiente de produção
        api: 'streamingV2', // Especificação para usar o formato SVF2 [cite: 1971-1972]

        // Função crucial: Usada pelo Viewer para renovar o Access Token automaticamente
        getAccessToken: function(onTokenReady) {
            var timeInSeconds = 3600; // O Viewer renovará o token após este tempo
            // Passamos o token obtido na autenticação
            onTokenReady(accessToken, timeInSeconds);
        }
    };

    Autodesk.Viewing.Initializer(options, function() {
        // Este callback é chamado quando a inicialização global está completa [cite: 1964, 1984]
        viewer = new Autodesk.Viewing.GuiViewer3D(viewerContainer); // Cria a instância do Viewer [cite: 1988]
        viewer.start(); // Inicia o motor de renderização [cite: 1990]

        // Adicionar Listeners de Eventos (Aula 7)
        viewer.addEventListener(Autodesk.Viewing.VIEWER_INITIALIZED, () => {
             console.log('Autodesk Viewer inicializado com sucesso!'); [cite: 985-988]
             // Personalizações aqui
             viewer.setSelectionColor(new THREE.Color(0xFF0000), Autodesk.Viewing.SelectionType.MIXED); [cite: 1032-1033]
        });

        // Adicionar listener para quando a geometria estiver carregada (Ex: zoom)
        viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, (event) => {
             console.log('Modelo carregado com sucesso.'); [cite: 994-997]
             viewer.fitToView(); // Ajusta a visualização para caber o modelo [cite: 998]
        });

    });
}


// === CARREGAMENTO DO MODELO BIM ===

// Função para carregar o URN
async function loadModel() {
    if (!viewer) {
        console.error('O Viewer não foi inicializado.');
        return;
    }

    const urn = urnInput.value.trim();
    if (!urn) {
        alert('Por favor, insira um URN válido.');
        return;
    }

    // O Viewer SDK requer o URN em formato Base64 não acolchoado
    const encodedUrn = btoa(urn).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+\$/, ''); [cite: 2001]
    const documentId = 'urn:' + encodedUrn; [cite: 1998]

    console.log('Carregando modelo:', documentId);

    Autodesk.Viewing.Document.load(
        documentId,
        onDocumentLoadSuccess,
        onDocumentLoadFailure // Callback em caso de falha [cite: 1996]
    );
}

// Callback de Sucesso
function onDocumentLoadSuccess(doc) {
    // Obtém o item visualizável (a geometria) a partir do manifesto do documento [cite: 2007]
    var viewable = doc.getRoot().getDefaultGeometry();

    if (viewable) {
        viewer.loadDocumentNode(doc, viewable); // Carrega o modelo no Viewer [cite: 2008]
    } else {
        console.error('Nenhuma geometria padrão encontrada no documento.');
    }
}

// Callback de Falha
function onDocumentLoadFailure(viewerErrorCode) {
    console.error('Falha ao carregar o documento:', viewerErrorCode); [cite: 2016-2017]
    alert('Falha ao carregar o modelo. Código de erro: ' + viewerErrorCode);
}

// Associa o botão 'Carregar Modelo' à função
loadModelButton.addEventListener('click', loadModel);

// ===============================================
// === RENDERIZAÇÃO E NAVEGAÇÃO HIERÁRQUICA ===
// ===============================================

// --- Funções de Ajuda de Renderização ---

function renderNode(id, name, type, parentId = null) {
    const node = document.createElement('div');
    node.className = 'node-item';

    // Adicione um ícone (usando um emoji ou FontAwesome se disponível)
    let icon = '';
    if (type === 'hubs') icon = '🏢';
    else if (type === 'projects') icon = '🏗️';
    else if (type === 'folders') icon = '📂';
    else if (type === 'items') icon = '📄';

    node.innerHTML = `<span class="node-icon">${icon}</span> ${name}`;
    node.dataset.id = id;
    node.dataset.type = type;
    if (parentId) node.dataset.parentId = parentId;

    // Adiciona o evento de click para navegar
    node.addEventListener('click', () => handleNodeClick(node));

    return node;
}

function clearTree() {
    dataTree.innerHTML = '';
}

function setLoading(message = 'A carregar...') {
    dataTree.innerHTML = `<p class="loading-message">${message}</p>`;
}

// --- Funções de Chamada ao Backend (DM API) ---

async function fetchApsData(url, errorMessage) {
    try {
        setLoading();
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorMessage);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        dataTree.innerHTML = `<p class="error-message">Erro: ${error.message}</p>`;
        console.error(error);
        return null;
    }
}

// --- Listar Hubs (Ponto de Partida) ---

async function listHubs() {
    clearTree();
    setLoading('A carregar Hubs...');

    const data = await fetchApsData('/api/dm/hubs', 'Não foi possível carregar os Hubs. Verifique o Access Token.');

    if (data && data.data) {
        clearTree();
        data.data.forEach(hub => {
            const node = renderNode(hub.id, hub.attributes.name, 'hubs');
            dataTree.appendChild(node);
        });
    }
}

// --- Listar Projetos ---

async function listProjects(hubId) {
    clearTree();
    setLoading('A carregar projetos...');

    // Rota: /api/dm/hubs/:hub_id/projects
    const url = `/api/dm/hubs/${hubId}/projects`;
    const data = await fetchApsData(url, 'Não foi possível carregar os projetos.');

    if (data && data.data) {
        clearTree();
        data.data.forEach(project => {
            const name = project.attributes.name;
            const node = renderNode(project.id, name, 'projects', hubId);
            dataTree.appendChild(node);
        });
    }
}

// --- Listar Conteúdos (Top Folders ou Subpastas) ---

async function listContents(type, parentId, projectId) {
    clearTree();
    setLoading('A carregar conteúdos...');

    let url;
    // Se o pai é um projeto, procuramos as Top Folders
    if (type === 'projects') {
        // Rota: /api/dm/hubs/:hub_id/projects/:project_id/contents
        const hubId = parentId;
        const project_id = projectId;
        url = `/api/dm/hubs/${hubId}/projects/${project_id}/contents`;
    }
    // Se o pai é uma pasta, procuramos o seu conteúdo
    else if (type === 'folders') {
        // Rota: /api/dm/folders/:project_id/:folder_id/contents
        const folder_id = parentId; // Neste caso, parentId é o ID da pasta
        url = `/api/dm/folders/${projectId}/${folder_id}/contents`;
    } else {
        return;
    }

    const data = await fetchApsData(url, 'Não foi possível carregar os conteúdos.');

    if (data && data.data) {
        clearTree();
        data.data.forEach(item => {
            const name = item.attributes.displayName || item.attributes.name;
            const itemType = item.type === 'items' ? 'items' : 'folders';

            const node = renderNode(item.id, name, itemType, parentId);
            // Salva o URN da versão mais recente se for um item, para podermos carregar o modelo
            if (itemType === 'items' && item.relationships.tip) {
                const versionUrn = item.relationships.tip.data.id;
                node.dataset.versionUrn = versionUrn;
            }
            dataTree.appendChild(node);
        });

        // Adiciona um botão de "Voltar"
        const backButton = document.createElement('button');
        backButton.textContent = '← Voltar';
        backButton.className = 'back-button';
        backButton.onclick = () => {
            // Lógica de navegação de volta (precisa de ser implementada com um stack de navegação)
        };
        dataTree.prepend(backButton);
    }
}

// --- Handler de Clique (Navegação Principal) ---

let currentNavigationStack = []; // [ { type: 'hubs' } , { type: 'projects', id: 'b.xxx' } ]

async function handleNodeClick(node) {
    const { id, type, parentId } = node.dataset;

    // Lógica principal de navegação
    if (type === 'hubs') {
        currentNavigationStack.push({ id, type });
        await listProjects(id);
    } else if (type === 'projects') {
        const hubId = parentId;
        currentNavigationStack.push({ id, type, hubId });
        await listContents(type, hubId, id); // Top Folders
    } else if (type === 'folders') {
        const projectId = currentNavigationStack.find(n => n.type === 'projects').id;
        currentNavigationStack.push({ id, type, projectId });
        await listContents(type, id, projectId); // Conteúdo da Pasta
    } else if (type === 'items') {
        // É um item/ficheiro, podemos carregá-lo no Viewer
        const versionUrn = node.dataset.versionUrn;
        if (versionUrn) {
            // O URN da versão é armazenado no item! (Aula 16)
            urnInput.value = versionUrn;
            loadModel(); // Carrega o modelo
        }
    }
}

// --- Inicialização da Navegação ---

// Chamado após Autenticação
async function startNavigation() {
    currentNavigationStack = [];
    await listHubs();
}


// === INÍCIO DA APLICAÇÃO ===

async function startApp() {
    // 1. Verificar se o Access Token já está na sessão
    const isAuthenticated = await checkAuthStatus();

    // 2. Se autenticado, inicializa o Viewer.
    // Se não, o Viewer será inicializado assim que o token for obtido/redirecionado.
    if (isAuthenticated) {
        initializeViewer();
    } else {
        // Se a página de callback for acessada, o token é obtido
        if (window.location.search.includes('code=')) {
            // Se estiver na página de callback, o backend é que trata do token
            // Esta lógica DEVE ser tratada no backend (forgeRoutes.js)
            statusIndicator.textContent = 'Status: Redirecionado... esperando token';
        }
    }
}

// Inicia o fluxo
startApp();