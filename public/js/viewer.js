// --- VARIÁVEIS GLOBAIS ---
let viewer = null;
let accessToken = null;
let allMaterials = [];
let isGridView = false; // Começa como Tabela

// Referências UI
const loginOverlay = document.getElementById('loginOverlay');
const btnLoginBig = document.getElementById('btnLoginBig');
const btnBypass = document.getElementById('btnBypass');
const btnLoginHeader = document.getElementById('btnLoginHeader');
const statusIndicator = document.getElementById('statusIndicator');
const urnInput = document.getElementById('urnInput');
const btnLoadModel = document.getElementById('btnLoadModel');
const btnAudit = document.getElementById('btnAudit');
const btnClearColors = document.getElementById('btnClearColors');
const auditLegend = document.getElementById('auditLegend');
const auditStats = document.getElementById('auditStats');

const productModal = document.getElementById('productModal');
const closeModal = document.getElementById('closeModal');
const btnOpenAddModal = document.getElementById('btnOpenAddModal');
const addMaterialModal = document.getElementById('addMaterialModal');
const closeAddModal = document.getElementById('closeAddModal');
const btnCancelAdd = document.getElementById('btnCancelAdd');
const addMaterialForm = document.getElementById('addMaterialForm');

// Vista e Filtro
const btnToggleView = document.getElementById('btnToggleView');
const tableContainer = document.getElementById('tableContainer');
const materialsGrid = document.getElementById('materialsGrid');
const filterInput = document.getElementById('filterInput');


// --- 1. INICIALIZAÇÃO ---

async function initApp() {
    await fetchMaterials();
    await checkAuthStatus();
}

if (btnLoginBig) btnLoginBig.onclick = () => window.location.href = '/api/auth/login';
if (btnLoginHeader) btnLoginHeader.onclick = () => window.location.href = '/api/auth/login';
if (btnBypass) {
    btnBypass.onclick = () => {
        loginOverlay.classList.add('hidden');
        statusIndicator.textContent = '⚠️ Modo Demo (Offline)';
        statusIndicator.style.color = '#ff9800';
        btnLoginHeader.style.display = 'none';
        btnLoadModel.disabled = true;
        btnLoadModel.textContent = "Indisponível (Demo)";
        urnInput.disabled = true;
        urnInput.placeholder = "Autodesk Viewer desativado no Modo Demo";
    };
}

// --- LÓGICA DE VISTA E FILTRO ---

// 1. Toggle View
if (btnToggleView) {
    btnToggleView.onclick = () => {
        isGridView = !isGridView;
        updateViewDisplay();
    };
}

// 2. Filtro (Pesquisa)
if (filterInput) {
    filterInput.addEventListener('keyup', () => {
        updateViewDisplay(); // Atualiza a vista com base no filtro
    });
}

// 3. Função Mestra de Display
function updateViewDisplay() {
    // A. Filtrar os dados primeiro
    const term = filterInput ? filterInput.value.toLowerCase() : "";
    const filtered = allMaterials.filter(mat =>
        mat.name.toLowerCase().includes(term) ||
        mat.category.toLowerCase().includes(term) ||
        mat.brand.toLowerCase().includes(term)
    );

    // B. Decidir qual vista mostrar
    if (isGridView) {
        tableContainer.classList.add('hidden');
        materialsGrid.classList.remove('hidden');
        btnToggleView.innerHTML = '<span class="material-icons" style="font-size: 1.2em;">view_list</span>';
        renderMaterialsGrid(filtered);
    } else {
        materialsGrid.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        btnToggleView.innerHTML = '<span class="material-icons" style="font-size: 1.2em;">grid_view</span>';
        renderMaterialsTable(filtered);
    }
}


async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/token');
        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                accessToken = data.access_token;
                onUserAuthenticated();
                return;
            }
        }
    } catch (error) {
        console.error("Erro auth:", error);
    }
    onUserNotAuthenticated();
}

function onUserAuthenticated() {
    loginOverlay.classList.add('hidden');
    statusIndicator.textContent = '✅ Ligado à Autodesk';
    statusIndicator.style.color = '#4caf50';
    btnLoginHeader.style.display = 'none';
    btnLoadModel.disabled = false;
    urnInput.disabled = false;
    initializeViewerEnvironment();
}

function onUserNotAuthenticated() {
    loginOverlay.classList.remove('hidden');
    statusIndicator.textContent = '❌ Não Autenticado';
    btnLoadModel.disabled = true;
}


// --- 2. GESTÃO DE DADOS ---

async function fetchMaterials() {
    try {
        const res = await fetch('/api/materiais');
        const json = await res.json();
        const rawData = Array.isArray(json) ? json : (json.data || json.records || []);

        allMaterials = rawData.map(r => {
            const f = r.fields || r;
            const imgField = f['Foto do Material'] || f['Imagem'] || f['Foto'] || f['Attachments'];
            let realPhotoUrl = null;
            if (Array.isArray(imgField) && imgField.length > 0) {
                if (imgField[0].url) realPhotoUrl = imgField[0].url;
            } else if (typeof imgField === 'string') {
                realPhotoUrl = imgField;
            }

            return {
                id: r.id,
                name: f['Nome do Material'] || f.name || 'Sem Nome',
                brand: f['Marca'] || f['Brand'] || '-',
                category: f['Categoria'] || 'Geral',
                price: f['Preço'] || f['Price'] || f['Cost'] || '-',
                supplier: f['Fornecedor'] || 'Desconhecido',
                description: f['Descrição'] || f['Notes'] || '',
                techParams: f['Parâmetros Técnicos'] || '',
                photo: realPhotoUrl
            };
        });

        updateViewDisplay();

    } catch (err) {
        console.error("Erro ao carregar materiais:", err);
    }
}

// RENDER TABELA
function renderMaterialsTable(materials) {
    const tbody = document.getElementById('materialsTableBody');
    tbody.innerHTML = '';

    if(materials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Nenhum material encontrado.</td></tr>';
        return;
    }

    materials.forEach((mat) => {
        const tr = document.createElement('tr');
        let imgHtml = '<span style="font-size:1.2em; opacity:0.3;">🖼️</span>';
        if (mat.photo) {
            imgHtml = `<img src="${mat.photo}" alt="${mat.name}" style="height:35px; width:35px; object-fit:cover; border-radius:4px; border:1px solid #ddd;">`;
        }
        let displayPrice = mat.price;
        if(typeof mat.price === 'number') displayPrice = mat.price + " €";

        tr.innerHTML = `
            <td style="text-align:center;">${imgHtml}</td>
            <td><strong>${mat.name}</strong></td>
            <td>${mat.brand}</td>
            <td>${mat.category}</td>
            <td>${displayPrice}</td>
            <td>${mat.supplier}</td>
            <td style="text-align:center;">
                <button class="btn-icon delete" title="Remover" onclick="deleteMaterial(event, '${mat.id}')">❌</button>
            </td>
        `;
        tr.onclick = () => openProductDetails(mat);
        tbody.appendChild(tr);
    });
}

// RENDER GRELHA
function renderMaterialsGrid(materials) {
    materialsGrid.innerHTML = '';
    if(materials.length === 0) {
        materialsGrid.innerHTML = '<p>Nenhum material encontrado.</p>';
        return;
    }
    materials.forEach((mat) => {
        const card = document.createElement('div');
        card.className = 'material-card';
        let imgHtml = '<span style="font-size:2em; color:#ccc;">🏗️</span>';
        if (mat.photo) imgHtml = `<img src="${mat.photo}" alt="${mat.name}">`;

        let displayPrice = mat.price;
        if(typeof mat.price === 'number') displayPrice = mat.price + " €";

        card.innerHTML = `
            <div class="card-delete-btn" onclick="deleteMaterial(event, '${mat.id}')" title="Apagar">✕</div>
            <div class="card-img-container">${imgHtml}</div>
            <div class="card-title">${mat.name}</div>
            <div class="card-details">
                <span>Marca: <strong>${mat.brand}</strong></span>
                <span>${mat.category}</span>
            </div>
            <div class="card-price">${displayPrice}</div>
        `;
        card.onclick = () => openProductDetails(mat);
        materialsGrid.appendChild(card);
    });
}


// --- 3. MODAIS ---

if(closeModal) closeModal.onclick = () => productModal.classList.add('hidden');
function openProductDetails(mat) {
    document.getElementById('modalTitle').textContent = mat.name;
    document.getElementById('modalCategory').textContent = mat.category;
    document.getElementById('modalBrand').textContent = mat.brand;
    document.getElementById('modalSupplier').textContent = mat.supplier;

    let displayPrice = mat.price;
    if(typeof mat.price === 'number') displayPrice = mat.price + " €";
    document.getElementById('modalPrice').textContent = displayPrice;

    document.getElementById('modalTechParams').textContent = mat.techParams || 'N/A';
    document.getElementById('modalDesc').textContent = mat.description || 'Sem descrição.';

    const imgEl = document.getElementById('modalImage');
    if (mat.photo) {
        imgEl.src = mat.photo;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
    }
    productModal.classList.remove('hidden');
}

if(btnOpenAddModal) btnOpenAddModal.onclick = () => addMaterialModal.classList.remove('hidden');
if(closeAddModal) closeAddModal.onclick = () => addMaterialModal.classList.add('hidden');
if(btnCancelAdd) btnCancelAdd.onclick = () => addMaterialModal.classList.add('hidden');

window.onclick = (event) => {
    if (event.target == productModal) productModal.classList.add('hidden');
    if (event.target == addMaterialModal) addMaterialModal.classList.add('hidden');
}

if(addMaterialForm) {
    addMaterialForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('newMatName').value,
            category: document.getElementById('newMatCategory').value,
            brand: document.getElementById('newMatBrand').value,
            price: document.getElementById('newMatPrice').value,
            supplier: document.getElementById('newMatSupplier').value,
            description: document.getElementById('newMatDesc').value,
            techParams: document.getElementById('newMatTechParams').value
        };

        try {
            const btnSubmit = addMaterialForm.querySelector('button[type="submit"]');
            btnSubmit.textContent = "A gravar...";
            btnSubmit.disabled = true;

            const res = await fetch('/api/materiais', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if(!res.ok) throw new Error("Erro ao gravar");

            await fetchMaterials();

            addMaterialModal.classList.add('hidden');
            addMaterialForm.reset();
            alert('Material gravado com sucesso! 🎉');
            btnSubmit.textContent = "💾 Gravar no Airtable";
            btnSubmit.disabled = false;

        } catch (error) {
            console.error(error);
            alert("Erro ao gravar.");
            addMaterialForm.querySelector('button[type="submit"]').disabled = false;
        }
    };
}

window.deleteMaterial = async (e, id) => {
    e.stopPropagation();
    if(confirm('ATENÇÃO: Isto vai apagar o registo permanentemente da Airtable. Continuar?')) {
        try {
            const res = await fetch(`/api/materiais/${id}`, { method: 'DELETE' });
            if(!res.ok) throw new Error("Erro ao apagar");
            await fetchMaterials();
        } catch (error) {
            console.error(error);
            alert("Erro ao apagar.");
        }
    }
};

// --- AUTODESK VIEWER ---
function initializeViewerEnvironment() {
    const options = {
        env: 'AutodeskProduction2', api: 'streamingV2',
        getAccessToken: function(onTokenReady) { onTokenReady(accessToken, 3600); }
    };
    Autodesk.Viewing.Initializer(options, () => {
        const div = document.getElementById('viewerContainer');
        viewer = new Autodesk.Viewing.GuiViewer3D(div);
        viewer.start();
        viewer.setQualityLevel(false, false); viewer.setGhosting(true);
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
            console.log("Modelo Carregado!");
            btnAudit.disabled = false; btnClearColors.disabled = false;
        });
    }, (errorCode) => { console.error("Erro load:", errorCode); alert("Erro ao carregar modelo."); });
}
btnAudit.onclick = () => { if (viewer) auditModel(); };
btnClearColors.onclick = () => {
    if (viewer) { viewer.clearThemingColors(); viewer.showAll(); auditLegend.classList.add('hidden'); }
};
function auditModel() {
    const model = viewer.model; const tree = model.getInstanceTree();
    let foundCount = 0; let missingCount = 0;
    const colorGreen = new THREE.Vector4(0, 1, 0, 0.5); const colorRed = new THREE.Vector4(1, 0, 0, 0.5);
    const leafIds = [];
    tree.enumNodeChildren(tree.getRootId(), (dbId) => { if (tree.getChildCount(dbId) === 0) leafIds.push(dbId); }, true);
    model.getBulkProperties(leafIds, ['Material', 'Structural Material'], (results) => {
        viewer.clearThemingColors();
        results.forEach((item) => {
            const dbId = item.dbId; let materialName = null;
            const matProp = item.properties.find(p => p.displayName.includes("Material"));
            if (matProp) materialName = matProp.displayValue;
            if (materialName) {
                const match = allMaterials.find(m => m.name.toLowerCase().trim() === materialName.toLowerCase().trim());
                if (match) { viewer.setThemingColor(dbId, colorGreen); foundCount++; }
                else { viewer.setThemingColor(dbId, colorRed); missingCount++; }
            } else { viewer.setThemingColor(dbId, colorRed); missingCount++; }
        });
        auditLegend.classList.remove('hidden');
        auditStats.innerHTML = `Elementos Certificados: <strong>${foundCount}</strong><br>Desconhecidos: <strong>${missingCount}</strong>`;
        alert(`Auditoria Finalizada!`);
    });
}

initApp();