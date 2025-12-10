// public/js/viewer.js

let viewer = null;
let accessToken = null;
const viewerContainer = document.getElementById('viewerContainer');
const statusIndicator = document.getElementById('statusIndicator');
const loadModelButton = document.getElementById('loadModelButton');
const urnInput = document.getElementById('urnInput');
const dataTree = document.getElementById('dataTree');
const sidebar = document.querySelector('.sidebar');

// --- 1. LÓGICA DE AUTENTICAÇÃO ---

document.getElementById('loginButton').addEventListener('click', () => {
    window.location.href = '/api/auth/login';
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/token');

        if (response.ok) {
            const data = await response.json();

            // ATENÇÃO: Se o token for a chave secreta de simulação, isto será sempre 'true'.
            if (data.access_token) {
                accessToken = data.access_token;
                statusIndicator.textContent = 'Status: Autenticado';
                statusIndicator.classList.add('authenticated');
                loadModelButton.disabled = false;

                initializeViewer();
                startNavigation();

                console.log('Access Token Obtido.');
                return true; // <--- O return está DENTRO da função
            }
        }
    } catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
    }

    statusIndicator.textContent = 'Status: Não Autenticado';
    statusIndicator.classList.remove('authenticated');
    loadModelButton.disabled = true;
    return false; // <--- O return está DENTRO da função
}

// --- 2. INICIALIZAÇÃO DO VIEWER SDK ---

function initializeViewer() {
    var options = {
        env: 'AutodeskProduction2',
        api: 'streamingV2',
        getAccessToken: function(onTokenReady) {
            var timeInSeconds = 3600;
            onTokenReady(accessToken, timeInSeconds);
        }
    };

    Autodesk.Viewing.Initializer(options, function() {
        viewer = new Autodesk.Viewing.GuiViewer3D(viewerContainer);
        viewer.start();

        viewer.addEventListener(Autodesk.Viewing.VIEWER_INITIALIZED, () => {
             console.log('Autodesk Viewer inicializado com sucesso!');
             viewer.setSelectionColor(new THREE.Color(0xFF0000), Autodesk.Viewing.SelectionType.MIXED);
        });

        viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, (event) => {
             console.log('Modelo carregado com sucesso.');
             viewer.fitToView();
        });
    });
}


// --- 3. CARREGAMENTO DO MODELO BIM ---

loadModelButton.addEventListener('click', loadModel);

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

    // Codificação Base64 para URN (sem padding, URL safe)
    const encodedUrn = btoa(urn).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+\$/, '');
    const documentId = 'urn:' + encodedUrn;

    console.log('Carregando modelo:', documentId);

    Autodesk.Viewing.Document.load(
        documentId,
        onDocumentLoadSuccess,
        onDocumentLoadFailure
    );
}

function onDocumentLoadSuccess(doc) {
    var viewable = doc.getRoot().getDefaultGeometry();

    if (viewable) {
        viewer.loadDocumentNode(doc, viewable);
    } else {
        console.error('Nenhuma geometria padrão encontrada no documento.');
    }
}

function onDocumentLoadFailure(viewerErrorCode) {
    console.error('Falha ao carregar o documento:', viewerErrorCode);
    alert('Falha ao carregar o modelo. Código de erro: ' + viewerErrorCode);
}


// ===============================================
// === 5. RENDERIZAÇÃO E NAVEGAÇÃO HIERÁRQUICA ===
// ===============================================

let currentNavigationStack = [];

function renderNode(id, name, type, parentId = null) {
    const node = document.createElement('div');
    node.className = 'node-item';

    let icon = '';
    if (type === 'hubs') icon = '🏢';
    else if (type === 'projects') icon = '🏗️';
    else if (type === 'folders') icon = '📂';
    else if (type === 'items') icon = '📄';

    node.innerHTML = `<span class="node-icon">${icon}</span> ${name}`;
    node.dataset.id = id;
    node.dataset.type = type;
    if (parentId) node.dataset.parentId = parentId;

    node.addEventListener('click', () => handleNodeClick(node));

    return node;
}

function clearTree() {
    dataTree.innerHTML = '';
}

function setLoading(message = 'A carregar...') {
    dataTree.innerHTML = `<p class="loading-message">${message}</p>`;
}

async function fetchApsData(url, errorMessage) {
    try {
        setLoading();
        // NOTA: Usamos o URL retornado do backend (que deve ter o Access Token)
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

// --- 5.1. Listar Hubs ---

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

// --- 5.2. Listar Projetos ---

async function listProjects(hubId) {
    clearTree();
    setLoading('A carregar projetos...');

    const url = `/api/dm/hubs/${hubId}/projects`;
    const data = await fetchApsData(url, 'Não foi possível carregar os projetos.');

    if (data && data.data) {
        clearTree();
        data.data.forEach(project => {
            const name = project.attributes.name;
            const node = renderNode(project.id, name, 'projects', hubId);
            dataTree.appendChild(node);
        });
        appendBackButton();
    }
}

// --- 5.3. Listar Conteúdos (Top Folders ou Subpastas) ---

async function listContents(type, parentId, projectId) {
    clearTree();
    setLoading('A carregar conteúdos...');

    let url;
    if (type === 'projects') {
        const hubId = parentId;
        const project_id = projectId;
        url = `/api/dm/hubs/${hubId}/projects/${project_id}/contents`;
    }
    else if (type === 'folders') {
        const folder_id = parentId;
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
            if (itemType === 'items' && item.relationships.tip) {
                const versionUrn = item.relationships.tip.data.id;
                node.dataset.versionUrn = versionUrn;
            }
            dataTree.appendChild(node);
        });
        appendBackButton();
    }
}

// --- 5.4. Handler de Clique (Navegação Principal) ---

async function handleNodeClick(node) {
    const { id, type, parentId, projectid } = node.dataset;

    if (type === 'hubs') {
        currentNavigationStack.push({ id, type, name: node.textContent.trim() });
        await listProjects(id);
    } else if (type === 'projects') {
        const hubId = parentId;
        currentNavigationStack.push({ id, type, hubId, name: node.textContent.trim() });
        await listContents(type, hubId, id);
    } else if (type === 'folders') {
        const projectNode = currentNavigationStack.find(n => n.type === 'projects');
        const projectId = projectNode ? projectNode.id : null;
        if (!projectId) return console.error("Project ID not found in stack.");

        currentNavigationStack.push({ id, type, projectId, name: node.textContent.trim() });
        await listContents(type, id, projectId);
    } else if (type === 'items') {
        const versionUrn = node.dataset.versionUrn;
        if (versionUrn) {
            urnInput.value = versionUrn;
            loadModel();
        }
    }
}

// --- 5.5. Lógica de Navegação 'Voltar' ---

function appendBackButton() {
    if (currentNavigationStack.length > 0) {
        const backButton = document.createElement('button');
        backButton.textContent = '← Voltar à Etapa Anterior';
        backButton.className = 'back-button';
        backButton.onclick = handleBackButtonClick;
        dataTree.prepend(backButton);
    }
}

async function handleBackButtonClick() {
    if (currentNavigationStack.length <= 1) { // Se só estivermos nos Hubs
        currentNavigationStack = [];
        await listHubs();
        return;
    }

    // Remove o estado atual e o estado anterior para navegar para o anterior ao anterior
    currentNavigationStack.pop();
    const previousState = currentNavigationStack.pop();

    if (!previousState) {
        await listHubs();
        return;
    }

    // Redireciona para o estado anterior
    const { id, type, hubId } = previousState;

    if (type === 'hubs') {
        await listProjects(id);
    } else if (type === 'projects') {
        await listContents(type, hubId, id);
    } else if (type === 'folders') {
        const projectId = previousState.projectId;
        await listContents(type, id, projectId);
    }
}

// --- 5.6. Inicialização da Navegação ---

async function startNavigation() {
    currentNavigationStack = [];
    await listHubs();
}

// --- 4. INÍCIO DA APLICAÇÃO ---

async function startApp() {
    // 1. Verifica autenticação. initializeViewer() e startNavigation() são chamadas aqui dentro se for OK.
    await checkAuthStatus();

    // Se o código de autenticação estiver na URL (após o callback do Autodesk), tentamos forçar o login
    // Isto é uma verificação de segurança, mas a troca real de código acontece no backend (forgeRoutes.js)
    if (window.location.search.includes('code=')) {
        statusIndicator.textContent = 'Status: Processando Login...';
    }
}

// Inicia o fluxo
startApp();