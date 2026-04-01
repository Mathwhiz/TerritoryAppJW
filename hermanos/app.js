import { db } from '../firebase.js';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, query, orderBy, limit, Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

window.addEventListener('pageshow', e => { if (e.persisted) window.location.reload(); });
if (!sessionStorage.getItem('congreId')) window.location.href = '../index.html';

const CONGRE_ID     = sessionStorage.getItem('congreId')     || '';
const CONGRE_NOMBRE = sessionStorage.getItem('congreNombre') || CONGRE_ID;

document.querySelectorAll('.js-congre').forEach(el => el.textContent = CONGRE_NOMBRE);

// ─────────────────────────────────────────
//   ROLES
// ─────────────────────────────────────────
const ROLES_ASIGN = [
  { id: 'LECTOR',                label: 'Lector' },
  { id: 'SONIDO',                label: 'Sonido' },
  { id: 'PLATAFORMA',            label: 'Plataforma' },
  { id: 'MICROFONISTAS',         label: 'Micrófonos' },
  { id: 'ACOMODADOR_AUDITORIO',  label: 'Acod. Auditorio' },
  { id: 'ACOMODADOR_ENTRADA',    label: 'Acod. Entrada' },
  { id: 'PRESIDENTE',            label: 'Pres. Reunión' },
  { id: 'REVISTAS',              label: 'Revistas' },
  { id: 'PUBLICACIONES',         label: 'Publicaciones' },
  { id: 'CONDUCTOR_GRUPO_1',     label: 'Conductor Grupo 1' },
  { id: 'CONDUCTOR_GRUPO_2',     label: 'Conductor Grupo 2' },
  { id: 'CONDUCTOR_GRUPO_3',     label: 'Conductor Grupo 3' },
  { id: 'CONDUCTOR_GRUPO_4',     label: 'Conductor Grupo 4' },
  { id: 'CONDUCTOR_CONGREGACION',    label: 'Conductor Cong.' },
  { id: 'SUPERINTENDENTE_CIRCUITO',  label: 'Sup. de Circuito' },
];

const ROLES_VM = [
  { id: 'VM_PRESIDENTE',               label: 'Presidente' },
  { id: 'VM_ORACION',                  label: 'Oración' },
  { id: 'VM_TESOROS',                  label: 'Discurso Tesoros' },
  { id: 'VM_JOYAS',                    label: 'Perlas escondidas' },
  { id: 'VM_LECTURA',                  label: 'Lectura Bíblica' },
  { id: 'VM_MINISTERIO_CONVERSACION',  label: 'Min. Conversación' },
  { id: 'VM_MINISTERIO_REVISITA',      label: 'Min. Revisita' },
  { id: 'VM_MINISTERIO_ESCENIFICACION',label: 'Min. Escenificación' },
  { id: 'VM_MINISTERIO_DISCURSO',      label: 'Min. Discurso' },
  { id: 'VM_VIDA_CRISTIANA',           label: 'Vida Cristiana' },
  { id: 'VM_ESTUDIO_CONDUCTOR',        label: 'Conductor Estudio' },
];

const TODOS_LOS_ROLES = [...ROLES_ASIGN, ...ROLES_VM];

function rolLabel(id) {
  return TODOS_LOS_ROLES.find(r => r.id === id)?.label || id;
}

// ─────────────────────────────────────────
//   ESTADO
// ─────────────────────────────────────────
let publicadores    = [];
let pinEncargado    = null;
let pinBuffer       = '';
let editandoId      = null;
let sheetsUrl       = null;
let semanasEspeciales = {};

// ─────────────────────────────────────────
//   UTILIDADES
// ─────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  document.getElementById('btn-home').classList.toggle('visible', id !== 'view-cover');
  if (id === 'view-cover') hideChatFab(); else showChatFab();
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pubCol() {
  return collection(db, 'congregaciones', CONGRE_ID, 'publicadores');
}

// ─────────────────────────────────────────
//   INIT — cargar config
// ─────────────────────────────────────────
(async function init() {
  try {
    const snap = await getDoc(doc(db, 'congregaciones', CONGRE_ID));
    if (snap.exists()) {
      const d = snap.data();
      pinEncargado = String(d.pinEncargado || '1234');
      if (d.sheetsUrl) {
        sheetsUrl = d.sheetsUrl;
        const btn = document.getElementById('btn-ver-planilla');
        if (btn) btn.style.display = '';
      }
    }
  } catch(e) {
    console.error('Error cargando config:', e);
  }
})();

// ─────────────────────────────────────────
//   PIN
// ─────────────────────────────────────────
function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pd' + i);
    if (!dot) continue;
    const filled = i < pinBuffer.length;
    dot.style.borderColor = filled ? '#D85A30' : '#555';
    dot.style.background  = filled ? '#D85A30' : 'transparent';
    dot.classList.toggle('filled', filled);
  }
  document.getElementById('pin-error').textContent = '';
}

window.pinPress = function(d) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += d;
  updatePinDots();
  if (pinBuffer.length === 4) setTimeout(checkPin, 150);
};

window.pinDelete = function() {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
};

function checkPin() {
  if (pinEncargado === null) {
    document.getElementById('pin-error').textContent = 'Cargando configuración…';
    pinBuffer = ''; updatePinDots(); return;
  }
  if (pinBuffer === pinEncargado) {
    pinBuffer = ''; updatePinDots();
    showView('view-menu');
  } else {
    document.getElementById('pin-error').textContent = 'PIN incorrecto';
    pinBuffer = ''; updatePinDots();
  }
}

window.goToCover = function() {
  pinBuffer = '';
  updatePinDots();
  showView('view-cover');
};

window.goToHermanos = function() {
  cargarYMostrar();
};

// ─────────────────────────────────────────
//   CARGAR PUBLICADORES
// ─────────────────────────────────────────
async function cargarYMostrar() {
  showView('view-main');
  document.getElementById('hermanos-list').innerHTML =
    '<div class="loading-wrap"><div class="spinner"></div><div class="loading-txt">Cargando…</div></div>';
  try {
    const snap = await getDocs(pubCol());
    publicadores = snap.docs.map(d => ({ id: d.id, ...d.data(), roles: d.data().roles || [] }));
    publicadores.sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
    renderLista(publicadores);
  } catch(e) {
    document.getElementById('hermanos-list').innerHTML =
      `<div class="error-wrap">Error al cargar: ${e.message}</div>`;
  }
}

window.goToEspeciales = function() {
  showView('view-especiales');
  cargarEspeciales();
};

// ─────────────────────────────────────────
//   RENDER LISTA
// ─────────────────────────────────────────
function renderLista(lista) {
  const el = document.getElementById('hermanos-list');
  if (!lista.length) {
    el.innerHTML = '<div class="empty-state">No hay hermanos cargados.</div>';
    return;
  }
  el.innerHTML = lista.map(h => {
    const asignRoles = (h.roles || []).filter(r => !r.startsWith('VM_'));
    const vmRoles    = (h.roles || []).filter(r => r.startsWith('VM_'));
    const chips = [
      ...asignRoles.map(r => `<span class="chip chip-asign">${esc(rolLabel(r))}</span>`),
      ...vmRoles.map(r    => `<span class="chip chip-vm">${esc(rolLabel(r))}</span>`),
    ].join('');
    return `<div class="hermano-row" onclick="abrirEditar('${h.id}')">
      <div class="hermano-info">
        <div class="hermano-nombre">${esc(h.nombre)}</div>
        <div class="hermano-chips">${chips || '<span class="sin-roles">Sin roles</span>'}</div>
      </div>
      <div class="hermano-actions">
        <button class="btn-del" onclick="event.stopPropagation();confirmarEliminar('${h.id}','${(h.nombre || '').replace(/'/g, "\\'")}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

window.filtrarLista = function() {
  const q   = norm(document.getElementById('h-search')?.value || '');
  const rol = document.getElementById('h-rol')?.value || '';
  renderLista(publicadores.filter(h =>
    (!q   || norm(h.nombre).includes(q)) &&
    (!rol || (rol === '__sin_roles__'
      ? (h.roles || []).length === 0
      : (h.roles || []).includes(rol)))
  ));
};

// ─────────────────────────────────────────
//   MODAL — ADD / EDIT
// ─────────────────────────────────────────
window.abrirNuevo = function() {
  editandoId = null;
  document.getElementById('modal-titulo').textContent = 'Nuevo hermano';
  document.getElementById('modal-nombre').value = '';
  document.getElementById('modal-status').textContent = '';
  TODOS_LOS_ROLES.forEach(r => {
    const cb = document.getElementById('hcb-' + r.id);
    if (cb) cb.checked = false;
  });
  document.getElementById('modal-hermano').style.display = 'flex';
  document.getElementById('modal-nombre').focus();
};

window.abrirEditar = function(id) {
  const h = publicadores.find(p => p.id === id);
  if (!h) return;
  editandoId = id;
  document.getElementById('modal-titulo').textContent = esc(h.nombre);
  document.getElementById('modal-nombre').value = h.nombre;
  document.getElementById('modal-status').textContent = '';
  TODOS_LOS_ROLES.forEach(r => {
    const cb = document.getElementById('hcb-' + r.id);
    if (cb) cb.checked = (h.roles || []).includes(r.id);
  });
  document.getElementById('modal-hermano').style.display = 'flex';
};

window.cerrarModal = function() {
  document.getElementById('modal-hermano').style.display = 'none';
  editandoId = null;
};

window.guardarHermano = async function() {
  const nombre = document.getElementById('modal-nombre').value.trim();
  if (!nombre) { uiToast('Ingresá un nombre', 'error'); return; }

  const roles = TODOS_LOS_ROLES
    .filter(r => document.getElementById('hcb-' + r.id)?.checked)
    .map(r => r.id);

  const status = document.getElementById('modal-status');
  status.style.color = '#888'; status.textContent = 'Guardando…';

  try {
    if (editandoId) {
      await updateDoc(doc(pubCol(), editandoId), { nombre, roles });
      const idx = publicadores.findIndex(p => p.id === editandoId);
      if (idx >= 0) publicadores[idx] = { ...publicadores[idx], nombre, roles };
    } else {
      const ref = await addDoc(pubCol(), { nombre, roles, activo: true });
      publicadores.push({ id: ref.id, nombre, roles, activo: true });
    }
    publicadores.sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
    cerrarModal();
    // reset filtros
    const searchEl = document.getElementById('h-search');
    const rolEl    = document.getElementById('h-rol');
    if (searchEl) searchEl.value = '';
    if (rolEl)    rolEl.value    = '';
    renderLista(publicadores);
    uiToast(editandoId ? 'Guardado' : 'Hermano agregado', 'success');
  } catch(e) {
    status.style.color = '#F09595'; status.textContent = 'Error: ' + e.message;
  }
};

window.confirmarEliminar = async function(id, nombre) {
  const ok = await uiConfirm({
    title: 'Eliminar hermano',
    msg: `¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger',
  });
  if (!ok) return;
  try {
    await deleteDoc(doc(pubCol(), id));
    publicadores = publicadores.filter(p => p.id !== id);
    renderLista(publicadores);
    uiToast('Eliminado', 'success');
  } catch(e) {
    uiToast('Error: ' + e.message, 'error');
  }
};

window.abrirPlanilla = function() {
  if (sheetsUrl) window.open(sheetsUrl, '_blank');
};

// ─────────────────────────────────────────
//   SEMANAS ESPECIALES
// ─────────────────────────────────────────
function especCol() {
  return collection(db, 'congregaciones', CONGRE_ID, 'semanasEspeciales');
}

const TIPO_LABELS = {
  conmemoracion:   'Conmemoración',
  superintendente: 'Visita superintendente',
  asamblea:        'Asamblea',
};
const TIPO_COLORS = {
  conmemoracion:   { color: '#E8C94A', bg: 'rgba(232,201,74,0.08)' },
  superintendente: { color: '#7F77DD', bg: 'rgba(127,119,221,0.08)' },
  asamblea:        { color: '#F09595', bg: 'rgba(240,149,149,0.08)' },
};

function fmtFechaCorta(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${String(y).slice(-2)}`;
}
function lunesISO(date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isoToDate(iso) { return iso ? new Date(iso + 'T00:00:00') : null; }

async function cargarEspeciales() {
  try {
    const snap = await getDocs(query(especCol(), orderBy('__name__')));
    semanasEspeciales = {};
    snap.forEach(d => { semanasEspeciales[d.id] = d.data(); });
    renderEspecialesList();
  } catch(e) { console.error('Error cargando especiales:', e); }
}

function renderEspecialesList() {
  const el = document.getElementById('especiales-lista');
  if (!el) return;
  const entries = Object.entries(semanasEspeciales).sort(([a],[b]) => a.localeCompare(b));
  if (!entries.length) {
    el.innerHTML = '<div class="especiales-empty">Sin semanas especiales configuradas.</div>';
    return;
  }
  el.innerHTML = entries.map(([lunes, e]) => {
    const { color } = TIPO_COLORS[e.tipo] || { color: '#eee' };
    const lunesDate   = isoToDate(lunes);
    const domingoDate = new Date(lunesDate); domingoDate.setDate(lunesDate.getDate() + 6);
    const rango = `${fmtFechaCorta(lunes)} – ${fmtFechaCorta(fmtDateLocal(domingoDate))}`;
    const label = TIPO_LABELS[e.tipo] || e.tipo;
    const extra = (e.tipo === 'conmemoracion' && e.fechaEvento !== lunes)
      ? `  ·  evento: ${fmtFechaCorta(e.fechaEvento)}` : '';
    return `<div class="especial-item">
      <div class="especial-dot" style="background:${color};"></div>
      <div class="especial-info">
        <div class="especial-label">${label}</div>
        <div class="especial-fecha">${rango}${extra}</div>
      </div>
      <button class="especial-del-btn" onclick="eliminarEspecial('${lunes}')">×</button>
    </div>`;
  }).join('');
}

window.toggleFormEspecial = function() {
  const f = document.getElementById('especiales-form');
  if (!f) return;
  const visible = f.style.display !== 'none';
  f.style.display = visible ? 'none' : '';
  if (!visible) {
    document.getElementById('esp-tipo').value = 'conmemoracion';
    document.getElementById('esp-fecha').value = '';
    window.actualizarLabelFechaEsp();
  }
};

window.actualizarLabelFechaEsp = function() {
  const tipo = document.getElementById('esp-tipo')?.value;
  const lbl  = document.getElementById('esp-fecha-label');
  if (lbl) lbl.textContent = tipo === 'conmemoracion'
    ? 'Fecha exacta del evento'
    : 'Fecha de la semana (cualquier día)';
};

window.guardarEspecial = async function() {
  const tipo  = document.getElementById('esp-tipo')?.value;
  const fecha = document.getElementById('esp-fecha')?.value;
  if (!tipo || !fecha) { await uiAlert('Completá todos los campos.'); return; }
  const lunes = lunesISO(new Date(fecha + 'T12:00:00'));
  const data  = { tipo, fechaEvento: fecha };
  try {
    await setDoc(doc(db, 'congregaciones', CONGRE_ID, 'semanasEspeciales', lunes), data);
    semanasEspeciales[lunes] = data;
    renderEspecialesList();
    window.toggleFormEspecial();
    uiToast(`${TIPO_LABELS[tipo]} guardada`, 'success');
  } catch(e) { await uiAlert('Error al guardar: ' + e.message); }
};

window.eliminarEspecial = async function(lunes) {
  const ok = await uiConfirm({ title: 'Eliminar semana especial', msg: '¿Seguro que querés eliminarla?', confirmText: 'Eliminar', type: 'danger' });
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'congregaciones', CONGRE_ID, 'semanasEspeciales', lunes));
    delete semanasEspeciales[lunes];
    renderEspecialesList();
    uiToast('Eliminada', 'success');
  } catch(e) { await uiAlert('Error: ' + e.message); }
};

// ─────────────────────────────────────────
//   CHAT / NOTAS — solo canal Congregación, autor "Administrador"
// ─────────────────────────────────────────
const CHAT_AUTOR = 'Administrador';

function chatNotasCol() {
  return collection(db, 'congregaciones', CONGRE_ID, 'chatNotas', 'congregacion', 'mensajes');
}

function getMisIdsAdmin() {
  try { return JSON.parse(sessionStorage.getItem('chatMisIdsAdmin') || '[]'); }
  catch { return []; }
}
function addMiIdAdmin(id) {
  const arr = getMisIdsAdmin(); arr.push(id);
  sessionStorage.setItem('chatMisIdsAdmin', JSON.stringify(arr));
}

// ─────────────────────────────────────────
//   DUPLICADOS
// ─────────────────────────────────────────
window.abrirDuplicados = async function() {
  showView('view-duplicados');
  const el = document.getElementById('dupes-list');
  const loading = document.getElementById('dupes-loading');
  el.innerHTML = '';
  loading.style.display = '';
  try {
    const snap = await getDocs(pubCol());
    publicadores = snap.docs.map(d => ({ id: d.id, ...d.data(), roles: d.data().roles || [] }));
    publicadores.sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
  } catch(e) {
    loading.style.display = 'none';
    el.innerHTML = `<div class="error-wrap">Error: ${e.message}</div>`;
    return;
  }
  loading.style.display = 'none';
  renderDuplicados();
};

function renderDuplicados() {
  const el = document.getElementById('dupes-list');
  const groups = {};
  publicadores.forEach(p => {
    const key = norm(p.nombre);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  const dupes = Object.values(groups).filter(g => g.length > 1);
  if (!dupes.length) {
    el.innerHTML = '<div class="empty-state">No se encontraron duplicados.</div>';
    return;
  }
  el.innerHTML = dupes.map(group => {
    const ids = group.map(p => p.id).join(',');
    const entries = group.map(p => {
      const asign = (p.roles||[]).filter(r => !r.startsWith('VM_'));
      const vm    = (p.roles||[]).filter(r =>  r.startsWith('VM_'));
      const chips = [
        ...asign.map(r => `<span class="chip chip-asign">${esc(rolLabel(r))}</span>`),
        ...vm.map(r    => `<span class="chip chip-vm">${esc(rolLabel(r))}</span>`),
      ].join('') || '<span class="sin-roles">Sin roles</span>';
      return `<div class="dup-entry">
        <div class="dup-entry-nombre">${esc(p.nombre)}</div>
        <div class="hermano-chips">${chips}</div>
      </div>`;
    }).join('');

    const allRoles = [...new Set(group.flatMap(p => p.roles || []))];
    const previewChips = allRoles.map(r => {
      const cls = r.startsWith('VM_') ? 'chip-vm' : 'chip-asign';
      return `<span class="chip ${cls}">${esc(rolLabel(r))}</span>`;
    }).join('') || '<span class="sin-roles">Sin roles</span>';

    return `<div class="dup-group">
      <div class="dup-header">
        <span class="dup-nombre">${esc(group[0].nombre)}</span>
        <span class="dup-count">${group.length} entradas</span>
      </div>
      <div class="dup-entries">${entries}</div>
      <div class="dup-preview">
        <div class="dup-preview-label">Resultado tras fusionar:</div>
        <div class="hermano-chips">${previewChips}</div>
      </div>
      <button class="btn-fusionar" onclick="fusionarGrupo('${ids}')">Fusionar</button>
    </div>`;
  }).join('');
}

window.fusionarGrupo = async function(idsStr) {
  const ids   = idsStr.split(',');
  const group = ids.map(id => publicadores.find(p => p.id === id)).filter(Boolean);
  if (group.length < 2) return;

  const ok = await uiConfirm({
    title: 'Fusionar duplicados',
    msg: `Se conservará "${group[0].nombre}" con todos los roles combinados y se eliminarán ${group.length - 1} entrada${group.length > 2 ? 's' : ''}.`,
    confirmText: 'Fusionar', cancelText: 'Cancelar', type: 'warn',
  });
  if (!ok) return;

  const winner   = group.reduce((a, b) => (b.roles||[]).length > (a.roles||[]).length ? b : a);
  const allRoles = [...new Set(group.flatMap(p => p.roles || []))];
  const toDelete = group.filter(p => p.id !== winner.id);

  try {
    await updateDoc(doc(pubCol(), winner.id), { roles: allRoles });
    for (const p of toDelete) await deleteDoc(doc(pubCol(), p.id));
    const winnerIdx = publicadores.findIndex(p => p.id === winner.id);
    if (winnerIdx >= 0) publicadores[winnerIdx] = { ...publicadores[winnerIdx], roles: allRoles };
    publicadores = publicadores.filter(p => !toDelete.some(d => d.id === p.id));
    publicadores.sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
    uiToast('Fusionado correctamente', 'success');
    renderDuplicados();
  } catch(e) {
    await uiAlert('Error: ' + e.message);
  }
};

function showChatFab() {
  const fab = document.getElementById('chat-fab');
  if (fab) fab.style.display = 'flex';
}
function hideChatFab() {
  const fab = document.getElementById('chat-fab');
  if (fab) fab.style.display = 'none';
}

window.openChatPanel = function() {
  const overlay = document.getElementById('chat-overlay');
  if (overlay) overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  refreshChatNotas();
};

window.closeChatPanel = function() {
  const overlay = document.getElementById('chat-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
};

function escapeHtml(str) {
  return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

async function refreshChatNotas() {
  const loadEl = document.getElementById('chat-loading');
  const listEl = document.getElementById('chat-list');
  const emptyEl = document.getElementById('chat-empty');
  const errEl = document.getElementById('chat-error');
  if (loadEl) { loadEl.style.display = ''; listEl.style.display = 'none'; if(emptyEl) emptyEl.style.display='none'; if(errEl) errEl.style.display='none'; }
  try {
    const snap = await getDocs(query(chatNotasCol(), orderBy('createdAt', 'desc'), limit(80)));
    if (loadEl) loadEl.style.display = 'none';
    const misIds = getMisIdsAdmin();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!items.length) { if(emptyEl) emptyEl.style.display=''; return; }
    listEl.innerHTML = items.map(n => {
      const esMio = misIds.includes(n.id);
      const fecha = n.createdAt?.toDate ? n.createdAt.toDate() : new Date();
      const fechaStr = `${String(fecha.getDate()).padStart(2,'0')}/${String(fecha.getMonth()+1).padStart(2,'0')} ${String(fecha.getHours()).padStart(2,'0')}:${String(fecha.getMinutes()).padStart(2,'0')}`;
      const acciones = esMio ? `<div class="chat-item-actions"><button class="chat-btn-edit" onclick="abrirEditNota('${n.id}',${JSON.stringify(n.texto||'').replace(/</g,'\\u003c')})">Editar</button><button class="chat-btn-del" onclick="eliminarNota('${n.id}')">Eliminar</button></div>` : '';
      return `<div class="chat-item"><div class="chat-item-head"><span class="chat-item-author">${escapeHtml(n.autor||'?')}</span><span class="chat-item-date">${fechaStr}</span></div><div class="chat-item-text">${escapeHtml(n.texto||'')}</div>${acciones}</div>`;
    }).join('');
    listEl.style.display = '';
  } catch(err) {
    if (loadEl) loadEl.style.display = 'none';
    if (errEl) { errEl.innerHTML = `<div class="error-wrap" style="margin:8px 12px;font-size:12px;">Error: ${err.message}</div>`; errEl.style.display = ''; }
  }
}

window.sendChatNota = async function(btnEl) {
  const texto = document.getElementById('chat-mensaje').value.trim();
  if (!texto) { await uiAlert('Escribí una nota antes de publicar.', 'Mensaje vacío'); return; }
  if (btnEl) btnEl.disabled = true;
  try {
    const ref = await addDoc(chatNotasCol(), {
      autor: CHAT_AUTOR, texto,
      createdAt: Timestamp.now(),
      canal: 'congregacion', grupo: 'C',
    });
    addMiIdAdmin(ref.id);
    document.getElementById('chat-mensaje').value = '';
    await refreshChatNotas();
    uiToast('Nota publicada', 'success');
  } catch(err) {
    await uiAlert(`No se pudo publicar: ${err.message}`, 'Error');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
};

let _chatEditDocId = null;

window.abrirEditNota = function(docId, textoActual) {
  _chatEditDocId = docId;
  const ta = document.getElementById('chat-edit-texto');
  if (ta) ta.value = textoActual;
  document.getElementById('chat-edit-modal').style.display = 'flex';
};

window.closeChatEdit = function() {
  document.getElementById('chat-edit-modal').style.display = 'none';
  _chatEditDocId = null;
};

window.confirmarEditNota = async function() {
  const texto = document.getElementById('chat-edit-texto').value.trim();
  if (!texto || !_chatEditDocId) return;
  try {
    await updateDoc(doc(chatNotasCol(), _chatEditDocId), { texto });
    closeChatEdit();
    await refreshChatNotas();
    uiToast('Nota actualizada', 'success');
  } catch(err) {
    await uiAlert('Error al editar: ' + err.message);
  }
};

window.eliminarNota = async function(docId) {
  const ok = await uiConfirm({ title: 'Eliminar nota', msg: '¿Eliminar este mensaje?', confirmText: 'Eliminar', type: 'danger' });
  if (!ok) return;
  try {
    await deleteDoc(doc(chatNotasCol(), docId));
    const misIds = getMisIdsAdmin().filter(id => id !== docId);
    sessionStorage.setItem('chatMisIdsAdmin', JSON.stringify(misIds));
    await refreshChatNotas();
    uiToast('Nota eliminada', 'success');
  } catch(err) {
    await uiAlert('Error: ' + err.message);
  }
};
