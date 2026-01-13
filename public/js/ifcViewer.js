const statusEl = document.getElementById('status');
const uploadForm = document.getElementById('uploadForm');

// Load viewer modules from CDN
let viewer;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [{ IfcViewerAPI }, THREE] = await Promise.all([
      import('https://unpkg.com/web-ifc-viewer@latest/dist/web-ifc-viewer.esm.js'),
      import('https://unpkg.com/three@latest/build/three.module.js')
    ].map(p => p.catch(e => { console.error(e); return undefined; })));

    if (!IfcViewerAPI) {
      statusEl.textContent = 'Erro ao carregar o módulo web-ifc-viewer.';
      return;
    }

    const container = document.getElementById('viewer');
    if (!container) {
      statusEl.textContent = 'Container do viewer não encontrado.';
      return;
    }

    // Ensure container has visible size
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      container.style.width = '100vw';
      container.style.height = '100vh';
    }

    viewer = new IfcViewerAPI({ container, backgroundColor: new THREE.Color(0xffffff) });

    // Ensure WASM is served from /wasm/ and configured
    if (viewer.IFC && typeof viewer.IFC.setWasmPath === 'function') {
      viewer.IFC.setWasmPath('/wasm/');
    } else if (viewer.IFC && viewer.IFC.loader && viewer.IFC.loader.ifcManager && typeof viewer.IFC.loader.ifcManager.setWasmPath === 'function') {
      viewer.IFC.loader.ifcManager.setWasmPath('/wasm/');
    }

    viewer.grid.setGrid();
    viewer.axes.setAxes();

    // Resize handler
    window.addEventListener('resize', () => viewer.context.renderer.resize());

    // Elements for properties / materials panel
    const propsPanel = document.getElementById('propsPanel');
    const propsContent = document.getElementById('propsContent');
    const closeProps = document.getElementById('closeProps');
    closeProps.addEventListener('click', () => { propsPanel.style.display = 'none'; });

    // Click handler: pick element, get properties and show material info
    container.addEventListener('click', async (event) => {
      try {
        // Prefer selector API if available
        let found;
        if (viewer.IFC && viewer.IFC.selector && typeof viewer.IFC.selector.pickIfcItem === 'function') {
          found = await viewer.IFC.selector.pickIfcItem(event.clientX, event.clientY, true);
        } else if (viewer.selector && typeof viewer.selector.pick === 'function') {
          found = await viewer.selector.pick(event);
        }
        if (!found) return;

        const { modelID, id } = found;
        const props = await viewer.IFC.getProperties(modelID, id, true);
        showProperties(props);
      } catch (err) {
        console.error('Error getting properties:', err);
      }
    });

    // Helper to display properties and material-related info
    function showProperties(props) {
      propsPanel.style.display = 'block';
      propsContent.innerHTML = '';

      function addRow(key, value) {
        const div = document.createElement('div');
        div.className = 'prop-row';
        div.innerHTML = `<span class="prop-key">${key}:</span><span class="prop-value">${value}</span>`;
        propsContent.appendChild(div);
      }

      addRow('Type', props.type || 'n/a');
      addRow('ExpressID', props.expressID || 'n/a');

      // Try to display common name fields
      if (props.Name) addRow('Name', (typeof props.Name === 'object' && props.Name.value) ? props.Name.value : props.Name);
      if (props.LongName) addRow('LongName', props.LongName);

      // Collect material-related entries by searching recursively
      const materials = [];
      function searchForMaterial(obj, parentKey = '') {
        if (!obj || typeof obj !== 'object') return;
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (k.toLowerCase().includes('material')) {
            materials.push({ key: parentKey ? `${parentKey}.${k}` : k, value: v });
          } else if (typeof v === 'object') {
            searchForMaterial(v, parentKey ? `${parentKey}.${k}` : k);
          }
        }
      }

      searchForMaterial(props);

      if (materials.length) {
        addRow('---', '---');
        addRow('Materials found', materials.length);
        materials.forEach(m => {
          let val = m.value;
          if (typeof val === 'object') {
            try { val = JSON.stringify(val); } catch (e) { val = String(val); }
          }
          addRow(m.key, val);
        });
      } else {
        addRow('Materials', 'No explicit material data found in properties');
      }

      // Also render full props JSON collapsed for debugging
      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.marginTop = '8px';
      pre.textContent = JSON.stringify(props, null, 2);
      propsContent.appendChild(pre);
    }

    statusEl.textContent = 'Viewer inicializado.';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Erro ao iniciar o viewer.';
  }
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('ifcFile');
  if (!input.files || input.files.length === 0) return;

  const form = new FormData();
  form.append('ifcFile', input.files[0]);

  statusEl.textContent = 'A carregar ficheiro...';

  try {
    const res = await fetch('/api/ifc/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Upload failed');

    statusEl.textContent = 'Ficheiro carregado. A desenhar o modelo...';
    const url = data.url;

    if (!viewer) {
      statusEl.textContent = 'Viewer não inicializado corretamente.';
      return;
    }

    // Ensure WASM path is configured (fallback)
    if (viewer.IFC && typeof viewer.IFC.setWasmPath === 'function') {
      viewer.IFC.setWasmPath('/wasm/');
    } else if (viewer.IFC && viewer.IFC.loader && viewer.IFC.loader.ifcManager && typeof viewer.IFC.loader.ifcManager.setWasmPath === 'function') {
      viewer.IFC.loader.ifcManager.setWasmPath('/wasm/');
    }

    await viewer.loadIfcUrl(url);

    statusEl.textContent = 'Modelo carregado.';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Erro: ' + (err.message || err);
  }
});