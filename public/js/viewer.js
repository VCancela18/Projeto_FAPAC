// --- VARIÁVEIS GLOBAIS ---
let viewer = null;
let accessToken = null;
let allMaterials = []; // Guarda os dados da Airtable

// Referências UI
const loginOverlay = document.getElementById('loginOverlay');
const btnLoginBig = document.getElementById('btnLoginBig');
const btnBypass = document.getElementById('btnBypass'); // Botão Modo Demo
const btnLoginHeader = document.getElementById('btnLoginHeader');
const statusIndicator = document.getElementById('statusIndicator');

const urnInput = document.getElementById('urnInput');
const btnLoadModel = document.getElementById('btnLoadModel');

const btnAudit = document.getElementById('btnAudit');
const btnClearColors = document.getElementById('btnClearColors');
const auditLegend = document.getElementById('auditLegend');
const auditStats = document.getElementById('auditStats');

// --- 1. GESTÃO DE AUTENTICAÇÃO E LOGIN ---

// Função principal de arranque
async function initApp() {
    // 1. Carregar materiais da BD (Airtable) independentemente do login
    await fetchMaterials();

    // 2. Verificar se o utilizador já tem sessão iniciada na Autodesk
    await checkAuthStatus();
}

// Listener do Botão de Login Real (Redireciona para a Autodesk)
if (btnLoginBig) btnLoginBig.onclick = () => window.location.href = '/api/auth/login';
if (btnLoginHeader) btnLoginHeader.onclick = () => window.location.href = '/api/auth/login';

// Listener do Botão de MODO DEMO (Ignora Autodesk)
if (btnBypass) {
    btnBypass.onclick = () => {
        console.log("🚀 A entrar em Modo Demo...");

        // Esconder o Overlay
        loginOverlay.classList.add('hidden');

        // Atualizar UI para mostrar aviso
        statusIndicator.textContent = '⚠️ Modo Demo (Offline)';
        statusIndicator.style.color = '#ff9800'; // Laranja
        btnLoginHeader.style.display = 'none';

        // Desativar funcionalidades Autodesk
        btnLoadModel.disabled = true;
        btnLoadModel.textContent = "Indisponível (Demo)";
        urnInput.disabled = true;
        urnInput.placeholder = "Autodesk Viewer desativado no Modo Demo";

        alert("Modo Demo Ativado!\n\n1. A lista do Airtable foi carregada (ver abaixo).\n2. O Autodesk Viewer está desligado.\n3. Use o botão 'Ir para IFC Viewer' no topo para testar ficheiros 3D.");
    };
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/token');
        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                // SUCESSO: Temos token válido! (Isto vai acontecer no PC do teu colega)
                accessToken = data.access_token;
                onUserAuthenticated();
                return;
            }
        }
    } catch (error) {
        console.error("Erro auth:", error);
    }
    // Se falhar a autenticação automática, mostramos o ecrã de login
    onUserNotAuthenticated();
}

function onUserAuthenticated() {
    // Esconder Overlay
    loginOverlay.classList.add('hidden');

    // Atualizar UI Header
    statusIndicator.textContent = '✅ Ligado à Autodesk';
    statusIndicator.style.color = '#4caf50';
    btnLoginHeader.style.display = 'none';

    // Ativar botões
    btnLoadModel.disabled = false;
    urnInput.disabled = false;

    // Inicializar Viewer
    initializeViewerEnvironment();
}

function onUserNotAuthenticated() {
    loginOverlay.classList.remove('hidden'); // Mostrar Overlay
    statusIndicator.textContent = '❌ Não Autenticado';
    btnLoadModel.disabled = true;
}


// --- 2. GESTÃO DE DADOS (AIRTABLE) ---

async function fetchMaterials() {
    try {
        const res = await fetch('/api/materiais');
        const json = await res.json();

        // Airtable devolve os dados às vezes dentro de 'records' ou direto, depende do controller
        // Assumimos que o teu controller devolve { data: [...] } ou [...]
        const rawData = Array.isArray(json) ? json : (json.data || json.records || []);

        allMaterials = rawData.map(r => {
            // Se o controller passar o objeto do airtable direto (fields)
            const f = r.fields || r;
            return {
                id: r.id,
                name: f['Nome do Material'] || f.name || 'Sem Nome',
                category: f['Categoria'] || 'Geral',
                supplier: f['Fornecedor'] || 'Desconhecido',
                photo: f.photoUrl || null // Ajustar conforme o teu campo de imagem
            };
        });

        renderMaterialsTable(allMaterials);
        console.log(`📦 ${allMaterials.length} materiais carregados da Airtable.`);

    } catch (err) {
        console.error("Erro ao carregar materiais:", err);
        document.querySelector('#materialsTableBody').innerHTML = '<tr><td colspan="4">Erro de conexão à Airtable.</td></tr>';
    }
}

function renderMaterialsTable(materials) {
    const tbody = document.getElementById('materialsTableBody');
    tbody.innerHTML = '';

    if(materials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum material encontrado.</td></tr>';
        return;
    }

    materials.forEach(mat => {
        const tr = document.createElement('tr');
        // Se houver imagem, mostra, senão põe um ícone
        const imgHtml = mat.photo ? `<img src="${mat.photo}" style="height:30px;border-radius:4px;">` : '📄';

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td><strong>${mat.name}</strong></td>
            <td>${mat.category}</td>
            <td>${mat.supplier}</td>
        `;
        tbody.appendChild(tr);
    });
}


// --- 3. AUTODESK VIEWER (SÓ FUNCIONA COM TOKEN) ---

function initializeViewerEnvironment() {
    const options = {
        env: 'AutodeskProduction2',
        api: 'streamingV2',
        getAccessToken: function(onTokenReady) {
            onTokenReady(accessToken, 3600);
        }
    };

    Autodesk.Viewing.Initializer(options, () => {
        const div = document.getElementById('viewerContainer');
        viewer = new Autodesk.Viewing.GuiViewer3D(div);
        viewer.start();
        viewer.setQualityLevel(false, false);
        viewer.setGhosting(true);
    });
}

btnLoadModel.onclick = () => {
    const urn = urnInput.value.trim();
    if (!urn) return alert("Por favor insira um URN válido.");
    loadModel('urn:' + urn);
};

function loadModel(documentId) {
    Autodesk.Viewing.Document.load(documentId, (doc) => {
        const defaultModel = doc.getRoot().getDefaultGeometry();
        viewer.loadDocumentNode(doc, defaultModel).then((model) => {
            console.log("Modelo 3D Carregado!");
            btnAudit.disabled = false;
            btnClearColors.disabled = false;
        });
    }, (errorCode) => {
        console.error("Erro load:", errorCode);
        alert("Erro ao carregar modelo. Token pode ter expirado ou URN inválido.");
    });
}


// --- 4. LÓGICA DE AUDITORIA (O CÉREBRO) ---

btnAudit.onclick = () => {
    if (!viewer) return;
    auditModel();
};

btnClearColors.onclick = () => {
    if (!viewer) return;
    viewer.clearThemingColors();
    viewer.showAll();
    auditLegend.classList.add('hidden');
};

function auditModel() {
    const model = viewer.model;
    const tree = model.getInstanceTree();

    let foundCount = 0;
    let missingCount = 0;

    // Cores para pintar o modelo
    const colorGreen = new THREE.Vector4(0, 1, 0, 0.5); // Validado
    const colorRed = new THREE.Vector4(1, 0, 0, 0.5);   // Desconhecido

    // 1. Obter todos os objetos físicos (folhas da árvore)
    const leafIds = [];
    tree.enumNodeChildren(tree.getRootId(), (dbId) => {
        if (tree.getChildCount(dbId) === 0) {
            leafIds.push(dbId);
        }
    }, true);

    // 2. Obter propriedades em massa
    // Procuramos por propriedades que contenham "Material"
    model.getBulkProperties(leafIds, ['Material', 'Structural Material'], (results) => {
        viewer.clearThemingColors();

        results.forEach((item) => {
            const dbId = item.dbId;
            let materialName = null;

            // Tentar encontrar o valor do material
            const matProp = item.properties.find(p => p.displayName.includes("Material"));
            if (matProp) materialName = matProp.displayValue;

            if (materialName) {
                // 3. Comparar com a lista da Airtable (allMaterials)
                // Usamos toLowerCase() e trim() para ignorar diferenças pequenas
                const match = allMaterials.find(m => m.name.toLowerCase().trim() === materialName.toLowerCase().trim());

                if (match) {
                    viewer.setThemingColor(dbId, colorGreen);
                    foundCount++;
                } else {
                    viewer.setThemingColor(dbId, colorRed);
                    missingCount++;
                }
            } else {
                // Se não tem material definido, marca como erro
                viewer.setThemingColor(dbId, colorRed);
                missingCount++;
            }
        });

        // 4. Mostrar Resultados
        auditLegend.classList.remove('hidden');
        auditStats.innerHTML = `
            Elementos Certificados: <strong>${foundCount}</strong><br>
            Elementos Desconhecidos: <strong>${missingCount}</strong>
        `;

        alert(`Auditoria Finalizada!\n${foundCount} materiais validados.\n${missingCount} materiais desconhecidos.`);
    });
}

// Iniciar Aplicação
initApp();