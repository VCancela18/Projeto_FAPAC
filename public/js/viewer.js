// public/js/viewer.js

let viewer = null;
let accessToken = null;
let allMaterials = []; // Armazena todos os materiais carregados
const viewerContainer = document.getElementById('viewerContainer');
const statusIndicator = document.getElementById('statusIndicator');
const loadModelButton = document.getElementById('loadModelButton');
const urnInput = document.getElementById('urnInput');
const dataTree = document.getElementById('dataTree');

// Variáveis do painel de materiais
const productsTableBody = document.getElementById('productsTableBody') || document.createElement('tbody');
const materialCountSpan = document.getElementById('materialCount') || document.createElement('span');
const materialFiltersContainer = document.getElementById('materialFilters');
let applyFiltersButton;


// --- 1. AUTENTICAÇÃO APS ---

document.getElementById('loginButton').addEventListener('click', () => {
    window.location.href = '/api/auth/login';
});

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

                initializeViewer();
                return true;
            }
        }
    } catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
    }

    statusIndicator.textContent = 'Status: Não Autenticado';
    statusIndicator.classList.remove('authenticated');
    loadModelButton.disabled = true;
    return false;
}



// --- 2. INICIALIZAÇÃO DO VIEWER AUTODESK ---

function initializeViewer() {
    const options = {
        env: 'AutodeskProduction2',
        api: 'streamingV2',
        getAccessToken: function(onTokenReady) {
            onTokenReady(accessToken, 3600);
        }
    };

    Autodesk.Viewing.Initializer(options, function() {
        viewer = new Autodesk.Viewing.GuiViewer3D(viewerContainer);
        viewer.start();

        viewer.addEventListener(Autodesk.Viewing.VIEWER_INITIALIZED, () => {
             console.log('Autodesk Viewer inicializado com sucesso!');
             if (typeof THREE !== 'undefined') {
                 viewer.setSelectionColor(new THREE.Color(0xFF0000), Autodesk.Viewing.SelectionType.MIXED);
             }
        });

        viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {
             console.log('Modelo carregado.');
             viewer.fitToView();
        });
    });
}



// --- 3. AIRTABLE / API DE MATERIAIS ---

async function loadMaterials() {
    try {
        const response = await fetch('/api/materiais');
        const data = await response.json();

        console.log("Dados recebidos da API:", data);

        // A API pode devolver { ok:true, data: [...] } ou um array
        const materials = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : data.records);

        if (!materials || materials.length === 0) {
            materialFiltersContainer.innerHTML = "<p>Sem materiais disponíveis.</p>";
            return;
        }

        // Gerar lista de categorias únicas (usando nomes de campos da sua Airtable)
        const categories = [...new Set(materials.map(m => m["Categoria"]))];

        materialFiltersContainer.innerHTML = ""; // Limpa a secção de filtros

        categories.forEach(cat => {
            if (!cat) return;

            const item = document.createElement("div");
            item.classList.add("filter-item");
            item.textContent = cat;
            item.onclick = () => filterByCategory(cat);

            materialFiltersContainer.appendChild(item);
        });

        console.log("Categorias encontradas:", categories);

        // Guarda globalmente para a tabela
        allMaterials = materials.map(r => ({ id: r.id, name: r['Nome do Material'] || r.name || r['Name'], category: r['Categoria'] || r.category, supplier: r['Fornecedor'] || r.supplier, bimId: r['BIM ID'] }));
        renderMaterialsTable(allMaterials);

    } catch (error) {
        console.error("Erro ao carregar materiais:", error);
    }
}



// --- 4. TABELA DE MATERIAIS ---

function renderMaterialsTable(materials) {
    productsTableBody.innerHTML = '';
    materialCountSpan.textContent = ` (${materials.length})`;

    materials.forEach(material => {
        const row = productsTableBody.insertRow();
        row.dataset.materialId = material.id;

        const photoCell = row.insertCell();
        const nameCell = row.insertCell();
        const categoryCell = row.insertCell();
        const supplierCell = row.insertCell();
        const actionCell = row.insertCell();

        const img = material.photoUrl || null;

        if (img) {
            photoCell.innerHTML = `<img src="${img}" alt="${material.name}" style="height:25px;width:25px;object-fit:cover;border-radius:3px;">`;
        } else {
            photoCell.textContent = '🖼️';
        }

        nameCell.textContent = material.name || '—';
        categoryCell.textContent = material.category || '—';
        supplierCell.textContent = material.supplier || '—';

        actionCell.innerHTML = `
            <button class="view-material-btn"
                data-bim-id="${material.bimId || ''}"
                style="padding:5px 10px; font-size:0.8em;">
                Ver BIM
            </button>
        `;
    });
}



// --- 5. FILTROS DINÂMICOS ---

function filterByCategory(category) {
    console.log("Filtro aplicado:", category);

    document.querySelectorAll(".material-card").forEach(card => {
        if (card.dataset.category === category || category === "all") {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}


function renderFilters(materials) {
    console.log("MATERIALS RECEBIDOS NO FILTRO:", materials);

    if (!materials || materials.length === 0) {
    materialFiltersContainer.innerHTML = "<p>Sem materiais disponíveis.</p>";
    return;
    }

    const uniqueCategories = [...new Set(materials.map(m => m.category).filter(Boolean))];
    const uniqueSuppliers  = [...new Set(materials.map(m => m.supplier).filter(Boolean))];

    materialFiltersContainer.innerHTML = '';

    if (uniqueCategories.length > 0) {
        const catGroup = createFilterGroup('Categoria', uniqueCategories, 'category');
        materialFiltersContainer.appendChild(catGroup);
    }

    if (uniqueSuppliers.length > 0) {
        const supGroup = createDropdownFilterGroup('Fornecedor', uniqueSuppliers, 'supplier');
        materialFiltersContainer.appendChild(supGroup);
    }

    const applyButtonDiv = document.createElement('div');
    applyButtonDiv.className = 'filter-group';
    applyButtonDiv.innerHTML = `<button id="applyFiltersButton">Aplicar Filtros</button>`;

    materialFiltersContainer.appendChild(applyButtonDiv);

    applyFiltersButton = document.getElementById('applyFiltersButton');
    applyFiltersButton.addEventListener('click', applyFilters);
}

function createFilterGroup(title, options, name) {
    const groupDiv = document.createElement('div');
    let html = `<h4>${title}</h4>`;

    options.forEach(option => {
        const id = `${name}-${option.replace(/\s+/g, '-')}`;
        html += `
            <div class="filter-option">
               <input type="checkbox" id="${id}" name="${name}" value="${option}" checked>
               <label for="${id}">${option}</label>
            </div>`;
    });

    groupDiv.innerHTML = html;
    return groupDiv;
}

function createDropdownFilterGroup(title, options, name) {
    const div = document.createElement('div');
    let html = `
        <h4>${title}</h4>
        <select id="${name}Filter">
            <option value="all">Todos</option>
    `;

    options.forEach(op => {
        html += `<option value="${op}">${op}</option>`;
    });

    html += `</select>`;
    div.innerHTML = html;
    return div;
}

function applyFilters() {
    const activeCategories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
                                  .map(cb => cb.value);

    const supplierDropdown = document.getElementById('supplierFilter');
    const selectedSupplier = supplierDropdown ? supplierDropdown.value : 'all';

    const filtered = allMaterials.filter(material => {
        const cMatch = activeCategories.includes(material.category);
        const sMatch = selectedSupplier === 'all' || material.supplier === selectedSupplier;
        return cMatch && sMatch;
    });

    renderMaterialsTable(filtered);
}



// --- 6. INÍCIO DA APLICAÇÃO ---

async function startApp() {
    await checkAuthStatus();
    await loadMaterials();
}

startApp();
