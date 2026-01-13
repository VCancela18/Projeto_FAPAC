// Minimal viewer script — uses CDN ESM for reliability
import { IFCViewerAPI } from '/modules/web-ifc-viewer/dist/web-ifc-viewer.esm.js';
import * as THREE from '/modules/three/build/three.module.js';

const container = document.getElementById('viewer-container');
const statusEl = document.getElementById('status');
if (!container) throw new Error('Viewer container não encontrado');

const viewer = new IFCViewerAPI({ container, backgroundColor: new THREE.Color(0xffffff) });

// Set wasm path to /wasm/ (should point to public/wasm/web-ifc.wasm)
if (viewer.IFC && typeof viewer.IFC.setWasmPath === 'function') {
  viewer.IFC.setWasmPath('/wasm/');
} else if (viewer.IFC && viewer.IFC.loader && viewer.IFC.loader.ifcManager && typeof viewer.IFC.loader.ifcManager.setWasmPath === 'function') {
  viewer.IFC.loader.ifcManager.setWasmPath('/wasm/');
}

// Check wasm availability
(async () => {
  try {
    const head = await fetch('/wasm/web-ifc.wasm', { method: 'HEAD' });
    if (!head.ok) {
      console.warn('WASM não encontrado em /wasm/web-ifc.wasm (status ' + head.status + ').');
      statusEl.textContent = 'AVISO: /wasm/web-ifc.wasm não encontrado. Copia o ficheiro do node_modules/web-ifc/web-ifc.wasm para public/wasm/';
    } else {
      console.log('WASM acessível em /wasm/web-ifc.wasm');
    }
  } catch (e) {
    console.warn('Erro ao verificar WASM:', e);
  }
})();

viewer.axes.setAxes();
viewer.grid.setGrid();

const input = document.getElementById('ifc-input');
input.addEventListener('change', async (evt) => {
  const file = evt.target.files[0];
  if (!file) return;

  statusEl.textContent = 'A preparar ficheiro...';
  const blobUrl = URL.createObjectURL(file);

  // Try loading directly from blob URL
  statusEl.textContent = 'A carregar ficheiro local (blob)...';
  console.log('Tentando carregar blob URL:', blobUrl);
  try {
    await viewer.loadIfcUrl(blobUrl);
    statusEl.textContent = 'IFC carregado com sucesso (local).';
    console.log('IFC carregado com sucesso a partir do blob');
    return;
  } catch (err) {
    console.warn('Falha ao carregar blob local, a tentar upload para servidor. Erro:', err);
    statusEl.textContent = 'Falha ao carregar localmente, a tentar upload para servidor...';
  }

  // Fallback: upload to server and load from returned URL
  try {
    const form = new FormData();
    form.append('ifcFile', file);
    const res = await fetch('/api/ifc/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Upload failed');

    const url = new URL(data.url, window.location.origin).href;
    console.log('Upload returned URL:', url);

    statusEl.textContent = 'Ficheiro enviado. A carregar a partir do servidor...';

    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) throw new Error('Uploaded file not accessible (status ' + head.status + ')');

    await viewer.loadIfcUrl(url);
    statusEl.textContent = 'IFC carregado com sucesso (servidor).';
    console.log('IFC carregado com sucesso a partir do servidor');
  } catch (uploadErr) {
    console.error('Erro ao carregar IFC após upload:', uploadErr);
    statusEl.textContent = 'Erro ao carregar IFC: ' + (uploadErr.message || uploadErr);
  }
});