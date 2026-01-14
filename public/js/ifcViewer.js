import { IfcViewerAPI } from 'https://esm.sh/web-ifc-viewer@1.0.209';

const container = document.getElementById('ifc-container');
const fileInput = document.getElementById('fileInput');
const loadingText = document.getElementById('loadingText');
const infoPanel = document.getElementById('info-panel');
const infoContent = document.getElementById('info-content');

let viewer = null;

async function init() {
    // 1. Inicializar Viewer
    viewer = new IfcViewerAPI({
        container: container,
        backgroundColor: 0xffffff
    });

    // 2. Caminho do Motor (WASM)
    // Esta é a parte que cria o ambiente corretamente
    await viewer.IFC.setWasmPath('https://unpkg.com/web-ifc@0.0.36/');

    viewer.grid.setGrid();
    viewer.axes.setAxes();
}

init();

fileInput.addEventListener('change', async (event) => {
    if (!viewer) return;

    const file = event.target.files[0];
    if (file) {
        loadingText.style.display = 'block';
        loadingText.textContent = "⏳ A carregar modelo...";
        infoPanel.style.display = 'none';

        try {
            await viewer.IFC.dispose();

            // Carregar modelo
            const model = await viewer.IFC.loadIfc(file, true);

            // Zoom automático
            if (model && viewer.context) {
                viewer.context.ifcCamera.cameraControls.fitToBox(model, true);
            }

            loadingText.style.display = 'none';
            console.log("IFC Carregado!");

        } catch (error) {
            console.error("Erro:", error);
            loadingText.textContent = "❌ Erro ao ler ficheiro.";
            loadingText.style.color = "red";
        }
    }
});

window.onmousemove = () => {
    if (viewer && viewer.IFC && viewer.IFC.selector) {
        viewer.IFC.selector.prePickIfcItem();
    }
};

window.ondblclick = async () => {
    if (!viewer || !viewer.IFC || !viewer.IFC.selector) return;

    const result = await viewer.IFC.selector.pickIfcItem(true);

    if (!result) {
        infoPanel.style.display = 'none';
        return;
    }

    const props = await viewer.IFC.getProperties(result.modelID, result.id, true);

    let typeName = 'Objeto';
    if (props.constructor && props.constructor.name) {
        typeName = props.constructor.name.replace('Ifc', '');
    }

    infoContent.innerHTML = `
        <strong>Nome:</strong> ${props.Name?.value || 'Sem Nome'}<br>
        <strong>Tipo:</strong> ${typeName}<br>
        <strong>ID Global:</strong> ${props.GlobalId?.value || '-'}<br>
    `;

    infoPanel.style.display = 'block';
};