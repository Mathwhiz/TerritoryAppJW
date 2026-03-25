import { db } from '../firebase.js';
import {
  collection, doc, getDoc, getDocs, setDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ─────────────────────────────────────────
//   CONSTANTES
// ─────────────────────────────────────────
const ROLES_VM = [
  { id: 'VM_PRESIDENTE',        label: 'Presidente' },
  { id: 'VM_ORACION',           label: 'Oración' },
  { id: 'VM_TESOROS',           label: 'Discurso Tesoros' },
  { id: 'VM_JOYAS',             label: 'Joyas Espirituales' },
  { id: 'VM_LECTURA',           label: 'Lectura Bíblica' },
  { id: 'VM_MINISTERIO',        label: 'Ministerio' },
  { id: 'VM_VIDA_CRISTIANA',    label: 'Vida Cristiana' },
  { id: 'VM_ESTUDIO_CONDUCTOR', label: 'Conductor Estudio' },
  { id: 'VM_ESTUDIO_LECTOR',    label: 'Lector Estudio' },
];

// Qué rol VM se requiere para cada tipo de slot
const SLOT_ROL = {
  'presidente':              'VM_PRESIDENTE',
  'oracionApertura':         'VM_ORACION',
  'oracionCierre':           'VM_ORACION',
  'tesoros.discurso':        'VM_TESOROS',
  'tesoros.joyas':           'VM_JOYAS',
  'tesoros.lecturaBiblica':  'VM_LECTURA',
  'tesoros.lecturaBiblica.ayudante': 'VM_LECTURA',
  'ministerio':              'VM_MINISTERIO',   // para cualquier índice
  'ministerio.ayudante':     'VM_MINISTERIO',
  'vidaCristiana':           'VM_VIDA_CRISTIANA',
  'estudio.conductor':       'VM_ESTUDIO_CONDUCTOR',
  'estudio.lector':          'VM_ESTUDIO_LECTOR',
};

// ─────────────────────────────────────────
//   ESTADO
// ─────────────────────────────────────────
let congreId    = null;
let congreNombre = null;
let pinVM       = null;
let publicadores = [];
let semanaData  = null;  // programa de la semana actualmente cargada/editada
let modoEncargado = false;

// ─────────────────────────────────────────
//   UTILS
// ─────────────────────────────────────────
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDisplaySemana(iso) {
  const dias = ['dom','lun','mar','mié','jue','vie','sáb'];
  const d = new Date(iso + 'T12:00:00');
  return `${dias[d.getDay()]} ${fmtDisplay(iso)}`;
}

function lunesDeDate(input) {
  const d = input instanceof Date ? new Date(input) : new Date(input + 'T12:00:00');
  const day = d.getDay(); // 0=dom, 1=lun, ..., 6=sáb
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return fmtDate(d);
}

function lunesDeHoy() {
  return lunesDeDate(new Date());
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────
//   PUBLICADORES
// ─────────────────────────────────────────
function pubsConRol(rol) {
  const filtrados = publicadores.filter(p => p.activo !== false && (p.roles || []).includes(rol));
  // Fallback a todos los activos si nadie tiene ese rol VM todavía
  if (filtrados.length === 0) return publicadores.filter(p => p.activo !== false);
  return filtrados;
}

function pubNombresConRol(rol) {
  return pubsConRol(rol).map(p => p.nombre);
}

function nombreDePub(pubId) {
  if (!pubId) return null;
  const p = publicadores.find(x => x.id === pubId);
  return p ? p.nombre : null;
}

function pubIdDeNombre(nombre) {
  if (!nombre) return null;
  const p = publicadores.find(x => x.nombre === nombre);
  return p ? p.id : null;
}

// ─────────────────────────────────────────
//   DATOS DEL SLOT (getters/setters)
// ─────────────────────────────────────────
function getSlotPubId(key) {
  if (!semanaData) return null;
  const parts = key.split('.');
  switch (parts[0]) {
    case 'presidente':      return semanaData.presidente;
    case 'oracionApertura': return semanaData.oracionApertura;
    case 'oracionCierre':   return semanaData.oracionCierre;
    case 'tesoros':
      if (parts[2] === 'ayudante') return semanaData.tesoros?.[parts[1]]?.ayudante;
      return semanaData.tesoros?.[parts[1]]?.pubId;
    case 'ministerio': {
      const idx = parseInt(parts[1]);
      if (parts[2] === 'ayudante') return semanaData.ministerio?.[idx]?.ayudante;
      return semanaData.ministerio?.[idx]?.pubId;
    }
    case 'vidaCristiana': {
      const idx = parseInt(parts[1]);
      return semanaData.vidaCristiana?.[idx]?.pubId;
    }
    case 'estudio':
      return parts[1] === 'conductor'
        ? semanaData.estudioBiblico?.conductor
        : semanaData.estudioBiblico?.lector;
    default: return null;
  }
}

function setSlotPubId(key, pubId) {
  if (!semanaData) return;
  const parts = key.split('.');
  switch (parts[0]) {
    case 'presidente':      semanaData.presidente = pubId; break;
    case 'oracionApertura': semanaData.oracionApertura = pubId; break;
    case 'oracionCierre':   semanaData.oracionCierre   = pubId; break;
    case 'tesoros':
      if (!semanaData.tesoros[parts[1]]) break;
      if (parts[2] === 'ayudante') semanaData.tesoros[parts[1]].ayudante = pubId;
      else semanaData.tesoros[parts[1]].pubId = pubId;
      break;
    case 'ministerio': {
      const idx = parseInt(parts[1]);
      if (!semanaData.ministerio[idx]) break;
      if (parts[2] === 'ayudante') semanaData.ministerio[idx].ayudante = pubId;
      else semanaData.ministerio[idx].pubId = pubId;
      break;
    }
    case 'vidaCristiana': {
      const idx = parseInt(parts[1]);
      if (!semanaData.vidaCristiana[idx]) break;
      semanaData.vidaCristiana[idx].pubId = pubId;
      break;
    }
    case 'estudio':
      if (!semanaData.estudioBiblico) semanaData.estudioBiblico = {};
      if (parts[1] === 'conductor') semanaData.estudioBiblico.conductor = pubId;
      else semanaData.estudioBiblico.lector = pubId;
      break;
  }
}

function getRolParaSlot(key) {
  const parts = key.split('.');
  if (parts[0] === 'ministerio')   return SLOT_ROL[parts[2] === 'ayudante' ? 'ministerio.ayudante' : 'ministerio'];
  if (parts[0] === 'vidaCristiana') return SLOT_ROL['vidaCristiana'];
  return SLOT_ROL[key] || null;
}

function keyToId(key) {
  return key.replace(/\./g, '-');
}

// ─────────────────────────────────────────
//   NAVEGACIÓN
// ─────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  document.getElementById('btn-home').classList.toggle('visible', id !== 'view-cover');
}

window.goToCover = function() {
  showView('view-cover');
};

window.goToPin = function() {
  document.getElementById('pin-error').textContent = '';
  showView('view-pin');
};

window.goToVerPrograma = async function() {
  showView('view-programa-pub');
  await cargarProgramaPublico();
};

window.goToSemanas = async function() {
  document.getElementById('semanas-congre-sub').textContent = congreNombre || '—';
  showView('view-semanas');
  await cargarSemanas();
};

window.goToSemana = async function(fecha) {
  // Si ya está cargada esa semana, no recargamos
  if (!semanaData || semanaData.fecha !== fecha) {
    uiLoading.show('Cargando…');
    try {
      const snap = await getDoc(doc(db, 'congregaciones', congreId, 'vidaministerio', fecha));
      if (snap.exists()) {
        semanaData = snap.data();
      }
      uiLoading.hide();
    } catch(e) {
      uiLoading.hide();
      await uiAlert('Error al cargar: ' + e.message);
      return;
    }
  }
  document.getElementById('semana-titulo-display').textContent = 'Semana del ' + fmtDisplay(semanaData.fecha);
  renderSemanaEdit();
  showView('view-semana');
};

window.goToNueva = function() {
  const lunes = lunesDeHoy();
  const fechaEl = document.getElementById('nueva-fecha');
  fechaEl.value = lunes;
  fechaEl.dispatchEvent(new Event('change', { bubbles: true }));
  showView('view-nueva');
};

// ─────────────────────────────────────────
//   PIN
// ─────────────────────────────────────────
let pinBuffer = '';

window.pinPress = function(d) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += d;
  updatePinDots();
  if (pinBuffer.length === 4) setTimeout(checkPin, 150);
};

window.pinDelete = function() {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
};

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    document.getElementById('vp' + i).classList.toggle('filled', i < pinBuffer.length);
  }
}

function checkPin() {
  if (pinBuffer === pinVM) {
    modoEncargado = true;
    pinBuffer = '';
    updatePinDots();
    goToSemanas();
  } else {
    document.getElementById('pin-error').textContent = 'PIN incorrecto';
    pinBuffer = '';
    updatePinDots();
  }
}

// ─────────────────────────────────────────
//   CARGA DE DATOS
// ─────────────────────────────────────────
async function cargarPublicadores() {
  try {
    const snap = await getDocs(collection(db, 'congregaciones', congreId, 'publicadores'));
    publicadores = [];
    snap.forEach(d => publicadores.push({ id: d.id, ...d.data() }));
    publicadores.sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
    );
  } catch(e) {
    console.error('Error al cargar publicadores:', e);
  }
}

async function cargarSemanas() {
  const list = document.getElementById('semanas-list');
  list.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><div class="loading-txt">Cargando…</div></div>';
  try {
    const q = query(
      collection(db, 'congregaciones', congreId, 'vidaministerio'),
      orderBy('fecha', 'desc')
    );
    const snap = await getDocs(q);
    const semanas = [];
    snap.forEach(d => semanas.push(d.data()));
    renderSemanas(semanas);
  } catch(e) {
    list.innerHTML = `<div class="error-wrap">Error al cargar: ${e.message}</div>`;
  }
}

async function cargarProgramaPublico() {
  const lunes = lunesDeHoy();
  const el = document.getElementById('pub-contenido');
  document.getElementById('pub-semana-titulo').textContent = 'Semana del ' + fmtDisplay(lunes);
  el.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><div class="loading-txt">Cargando…</div></div>';
  try {
    const snap = await getDoc(doc(db, 'congregaciones', congreId, 'vidaministerio', lunes));
    if (!snap.exists()) {
      el.innerHTML = '<div class="empty-state">No hay programa cargado para esta semana.<br><span style="color:#3a3a3a;">El encargado todavía no lo subió.</span></div>';
      return;
    }
    el.innerHTML = renderSemanaPublico(snap.data());
  } catch(e) {
    el.innerHTML = `<div class="error-wrap">Error: ${e.message}</div>`;
  }
}

// ─────────────────────────────────────────
//   RENDER — LISTA DE SEMANAS
// ─────────────────────────────────────────
function calcCompletitud(s) {
  let total = 0, filled = 0;
  const check = id => { total++; if (id) filled++; };

  check(s.presidente);
  check(s.oracionApertura);
  check(s.oracionCierre);
  check(s.tesoros?.discurso?.pubId);
  check(s.tesoros?.joyas?.pubId);
  check(s.tesoros?.lecturaBiblica?.pubId);
  (s.ministerio || []).forEach(p => check(p.pubId));
  (s.vidaCristiana || []).forEach(p => check(p.pubId));
  check(s.estudioBiblico?.conductor);
  check(s.estudioBiblico?.lector);

  if (filled === 0) return { clase: 'vacia', texto: 'Sin asignaciones' };
  if (filled === total) return { clase: 'completa', texto: `Completa ✓` };
  return { clase: 'parcial', texto: `${filled}/${total} asignados` };
}

function renderSemanas(semanas) {
  const list = document.getElementById('semanas-list');
  if (!semanas.length) {
    list.innerHTML = '<div class="empty-state">No hay semanas todavía.<br>Tocá <strong>+ Nueva semana</strong> para empezar.</div>';
    return;
  }
  const lunes = lunesDeHoy();
  list.innerHTML = semanas.map(s => {
    const c = calcCompletitud(s);
    const esActual = s.fecha === lunes;
    return `
      <div class="semana-card${esActual ? ' semana-actual' : ''}" onclick="goToSemana('${s.fecha}')">
        <div class="semana-card-info">
          <div class="semana-fecha">
            ${fmtDisplaySemana(s.fecha)}
            ${esActual ? '<span class="badge-actual">esta semana</span>' : ''}
          </div>
          <div class="estado-${c.clase}">${c.texto}</div>
        </div>
        <div class="semana-arrow">›</div>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────
//   RENDER — PROGRAMA PÚBLICO (solo lectura)
// ─────────────────────────────────────────
function renderSemanaPublico(s) {
  const row = (titulo, pubId, extra) => {
    const nombre = nombreDePub(pubId);
    return `<div class="pub-parte-row">
      <div class="pub-parte-titulo">${esc(titulo)}</div>
      <div class="pub-parte-nombre">${nombre ? esc(nombre) : '<span class="pub-parte-sin">—</span>'}${extra || ''}</div>
    </div>`;
  };

  let html = '';

  // Presidencia
  html += `<div class="pub-seccion">
    <div class="pub-seccion-hdr">Presidencia</div>
    ${row('Presidente', s.presidente)}
    ${row('Oración apertura', s.oracionApertura)}
    ${row('Oración cierre', s.oracionCierre)}
  </div>`;

  // Canciones
  const cancionStr = [s.cancionApertura, s.cancionIntermedia, s.cancionCierre]
    .map((c, i) => c ? `${['Ap.','Int.','Cie.'][i]} ${c}` : null).filter(Boolean).join(' · ');
  if (cancionStr) {
    html += `<div style="font-size:12px;color:#555;margin-bottom:14px;padding-left:1px;">${cancionStr}</div>`;
  }

  // Tesoros
  html += `<div class="pub-seccion">
    <div class="pub-seccion-hdr">1. Tesoros de la Palabra de Dios</div>
    ${row(s.tesoros?.discurso?.titulo || 'Discurso', s.tesoros?.discurso?.pubId)}
    ${row(s.tesoros?.joyas?.titulo || 'Joyas Espirituales', s.tesoros?.joyas?.pubId)}
    ${row(s.tesoros?.lecturaBiblica?.titulo || 'Lectura Bíblica', s.tesoros?.lecturaBiblica?.pubId)}
  </div>`;

  // Ministerio
  if (s.ministerio?.length) {
    html += `<div class="pub-seccion">
      <div class="pub-seccion-hdr">2. Seamos Mejores Maestros</div>
      ${s.ministerio.map(p => row(p.titulo || 'Parte', p.pubId)).join('')}
    </div>`;
  }

  // Vida Cristiana
  const vcPartes = (s.vidaCristiana || []).map(p => row(p.titulo || 'Parte', p.pubId)).join('');
  const estudio = s.estudioBiblico;
  const estudioHtml = estudio ? `<div class="pub-parte-row">
    <div class="pub-parte-titulo">${esc(estudio.titulo || 'Estudio Bíblico')}</div>
    <div class="pub-parte-nombre" style="text-align:right;">
      ${estudio.conductor ? `<div>${esc(nombreDePub(estudio.conductor) || '—')}</div>` : '<div class="pub-parte-sin">—</div>'}
      ${estudio.lector ? `<div style="font-size:11px;color:#888;">Lec. ${esc(nombreDePub(estudio.lector) || '')}</div>` : ''}
    </div>
  </div>` : '';
  html += `<div class="pub-seccion">
    <div class="pub-seccion-hdr">3. Nuestra Vida Cristiana</div>
    ${vcPartes}${estudioHtml}
  </div>`;

  return html;
}

// ─────────────────────────────────────────
//   RENDER — PROGRAMA EDITABLE
// ─────────────────────────────────────────
function renderAsigRow(label, key, pubId) {
  const nombre = nombreDePub(pubId);
  return `<div class="asig-row">
    <span class="asig-label">${label}</span>
    <button class="asignar-btn${nombre ? '' : ' empty'}" onclick="asignarSlot('${key}')">
      <span class="asig-icon">👤</span>
      <span id="asig-${keyToId(key)}">${nombre ? esc(nombre) : 'Asignar'}</span>
    </button>
  </div>`;
}

function renderAsigBtn(key, pubId, defaultLabel) {
  const nombre = nombreDePub(pubId);
  return `<button class="asignar-btn${nombre ? '' : ' empty'}" onclick="asignarSlot('${key}')">
    <span class="asig-icon">👤</span>
    <span id="asig-${keyToId(key)}">${nombre ? esc(nombre) : defaultLabel}</span>
  </button>`;
}

function renderParteItem(key, label, parte, opts = {}) {
  const quitar = opts.onRemove
    ? `<button class="btn-quitar-parte" onclick="${opts.onRemove}" title="Quitar">×</button>`
    : '';
  const dur = parte?.duracion ? `<span class="parte-dur-badge">${parte.duracion} min</span>` : '';
  return `<div class="parte-item">
    <div class="parte-meta-row">
      <span class="parte-label-text">${label}</span>${dur}${quitar}
    </div>
    <input class="parte-titulo-input" type="text"
           placeholder="Título de la parte…"
           value="${esc(parte?.titulo || '')}"
           oninput="onTituloChange('${key}', this.value)">
    ${renderAsigBtn(key, parte?.pubId, 'Asignar hermano')}
  </div>`;
}

function renderParteItemConAyudante(key, label, parte, opts = {}) {
  const ayKey = key + '.ayudante';
  const quitar = opts.onRemove
    ? `<button class="btn-quitar-parte" onclick="${opts.onRemove}" title="Quitar">×</button>`
    : '';
  const dur = parte?.duracion ? `<span class="parte-dur-badge">${parte.duracion} min</span>` : '';
  return `<div class="parte-item">
    <div class="parte-meta-row">
      <span class="parte-label-text">${label}</span>${dur}${quitar}
    </div>
    <input class="parte-titulo-input" type="text"
           placeholder="Título de la parte…"
           value="${esc(parte?.titulo || '')}"
           oninput="onTituloChange('${key}', this.value)">
    <div class="asig-double-row">
      ${renderAsigBtn(key, parte?.pubId, 'Asignar hermano')}
      ${renderAsigBtn(ayKey, parte?.ayudante, '+ Ayudante')}
    </div>
  </div>`;
}

function renderSemanaEdit() {
  if (!semanaData) return;
  const s = semanaData;
  let html = '';

  // ── Canciones y Presidencia
  html += `<div class="seccion-bloque">
    <div class="seccion-hdr hdr-general">
      <span class="seccion-hdr-icon">♪</span> Canciones y Presidencia
    </div>
    <div class="canciones-row">
      <div class="cancion-item">
        <label>Apertura</label>
        <input type="number" min="1" max="150" class="cancion-input"
               value="${s.cancionApertura || ''}"
               placeholder="Nro"
               oninput="onTituloChange('cancion.apertura', this.value)">
      </div>
      <div class="cancion-item">
        <label>Intermedia</label>
        <input type="number" min="1" max="150" class="cancion-input"
               value="${s.cancionIntermedia || ''}"
               placeholder="Nro"
               oninput="onTituloChange('cancion.intermedia', this.value)">
      </div>
      <div class="cancion-item">
        <label>Cierre</label>
        <input type="number" min="1" max="150" class="cancion-input"
               value="${s.cancionCierre || ''}"
               placeholder="Nro"
               oninput="onTituloChange('cancion.cierre', this.value)">
      </div>
    </div>
    ${renderAsigRow('Presidente', 'presidente', s.presidente)}
    ${renderAsigRow('Oración apertura', 'oracionApertura', s.oracionApertura)}
    ${renderAsigRow('Oración cierre', 'oracionCierre', s.oracionCierre)}
  </div>`;

  // ── Tesoros
  html += `<div class="seccion-bloque">
    <div class="seccion-hdr hdr-tesoros">
      <span class="seccion-hdr-num">1</span> Tesoros de la Palabra de Dios
    </div>
    ${renderParteItem('tesoros.discurso', 'Discurso', s.tesoros?.discurso)}
    ${renderParteItem('tesoros.joyas', 'Joyas Espirituales', s.tesoros?.joyas)}
    ${renderParteItemConAyudante('tesoros.lecturaBiblica', 'Lectura Bíblica', s.tesoros?.lecturaBiblica)}
  </div>`;

  // ── Ministerio
  const minPartes = (s.ministerio || []).map((p, i) =>
    renderParteItemConAyudante(
      `ministerio.${i}`, `Parte ${i + 1}`, p,
      { onRemove: `quitarParte('ministerio',${i})` }
    )
  ).join('');
  const btnAddMin = s.ministerio?.length < 4
    ? `<button class="btn-agregar-parte" onclick="agregarParte('ministerio')">+ Agregar parte</button>` : '';
  html += `<div class="seccion-bloque">
    <div class="seccion-hdr hdr-ministerio">
      <span class="seccion-hdr-num">2</span> Seamos Mejores Maestros
    </div>
    ${minPartes}${btnAddMin}
  </div>`;

  // ── Vida Cristiana
  const vcPartes = (s.vidaCristiana || []).map((p, i) =>
    renderParteItem(
      `vidaCristiana.${i}`, `Parte ${i + 1}`, p,
      { onRemove: `quitarParte('vidaCristiana',${i})` }
    )
  ).join('');
  const btnAddVC = (s.vidaCristiana?.length || 0) < 3
    ? `<button class="btn-agregar-parte" onclick="agregarParte('vidaCristiana')">+ Agregar parte</button>` : '';

  const est = s.estudioBiblico || {};
  const estudioHtml = `<div class="parte-item estudio-item">
    <div class="parte-meta-row">
      <span class="parte-label-text">Estudio Bíblico Congregacional</span>
      <span class="parte-dur-badge">30 min</span>
    </div>
    <input class="parte-titulo-input" type="text"
           placeholder="Libro/capítulo o tema…"
           value="${esc(est.titulo || '')}"
           oninput="onTituloChange('estudio', this.value)">
    <div class="asig-double-row">
      ${renderAsigBtn('estudio.conductor', est.conductor, 'Conductor')}
      ${renderAsigBtn('estudio.lector', est.lector, 'Lector')}
    </div>
  </div>`;

  html += `<div class="seccion-bloque">
    <div class="seccion-hdr hdr-vida">
      <span class="seccion-hdr-num">3</span> Nuestra Vida Cristiana
    </div>
    ${vcPartes}${btnAddVC}${estudioHtml}
  </div>`;

  html += `<button class="btn-wol" onclick="reimportarDeWOL()">↓ Reimportar títulos de WOL</button>`;
  html += `<button class="btn-primary guardar-btn" onclick="guardarSemana()">Guardar programa</button>`;
  html += `<div style="height:2rem;"></div>`;

  document.getElementById('semana-content').innerHTML = html;
}

// ─────────────────────────────────────────
//   EDICIÓN — HANDLERS
// ─────────────────────────────────────────
window.onTituloChange = function(key, value) {
  if (!semanaData) return;
  const parts = key.split('.');
  if (parts[0] === 'cancion') {
    const campo = { apertura: 'cancionApertura', intermedia: 'cancionIntermedia', cierre: 'cancionCierre' }[parts[1]];
    if (campo) semanaData[campo] = parseInt(value) || null;
  } else if (parts[0] === 'tesoros') {
    if (semanaData.tesoros?.[parts[1]]) semanaData.tesoros[parts[1]].titulo = value;
  } else if (parts[0] === 'ministerio') {
    const idx = parseInt(parts[1]);
    if (semanaData.ministerio?.[idx]) semanaData.ministerio[idx].titulo = value;
  } else if (parts[0] === 'vidaCristiana') {
    const idx = parseInt(parts[1]);
    if (semanaData.vidaCristiana?.[idx]) semanaData.vidaCristiana[idx].titulo = value;
  } else if (parts[0] === 'estudio') {
    if (!semanaData.estudioBiblico) semanaData.estudioBiblico = {};
    semanaData.estudioBiblico.titulo = value;
  }
};

window.asignarSlot = async function(key) {
  const rol = getRolParaSlot(key);
  const conductores = rol ? pubNombresConRol(rol) : publicadores.filter(p => p.activo !== false).map(p => p.nombre);
  const currentId = getSlotPubId(key);
  const currentNombre = nombreDePub(currentId) || '';

  const result = await uiConductorPicker({ conductores, value: currentNombre, label: 'Asignar hermano' });
  if (result === null) return;

  const pubId = result ? pubIdDeNombre(result) : null;
  setSlotPubId(key, pubId);

  // Actualizar solo el texto del botón (sin re-render completo)
  const el = document.getElementById('asig-' + keyToId(key));
  if (el) {
    el.textContent = result || (key.includes('ayudante') ? '+ Ayudante' : (key === 'estudio.lector' ? 'Lector' : key === 'estudio.conductor' ? 'Conductor' : 'Asignar hermano'));
    el.closest('.asignar-btn')?.classList.toggle('empty', !result);
  }
};

window.agregarParte = function(seccion) {
  if (!semanaData) return;
  if (seccion === 'ministerio') {
    if ((semanaData.ministerio?.length || 0) >= 4) { uiToast('Máximo 4 partes en esta sección', 'error'); return; }
    semanaData.ministerio = semanaData.ministerio || [];
    semanaData.ministerio.push({ titulo: '', tipo: 'demostracion', duracion: null, pubId: null, ayudante: null });
  } else if (seccion === 'vidaCristiana') {
    if ((semanaData.vidaCristiana?.length || 0) >= 3) { uiToast('Máximo 3 partes en esta sección', 'error'); return; }
    semanaData.vidaCristiana = semanaData.vidaCristiana || [];
    semanaData.vidaCristiana.push({ titulo: '', tipo: 'parte', duracion: null, pubId: null });
  }
  renderSemanaEdit();
};

window.quitarParte = function(seccion, idx) {
  if (!semanaData) return;
  if (seccion === 'ministerio') {
    if ((semanaData.ministerio?.length || 0) <= 1) { uiToast('Debe haber al menos una parte', 'error'); return; }
    semanaData.ministerio.splice(idx, 1);
  } else if (seccion === 'vidaCristiana') {
    semanaData.vidaCristiana = semanaData.vidaCristiana || [];
    semanaData.vidaCristiana.splice(idx, 1);
  }
  renderSemanaEdit();
};

window.guardarSemana = async function() {
  if (!semanaData) return;
  uiLoading.show('Guardando…');
  try {
    const ref = doc(db, 'congregaciones', congreId, 'vidaministerio', semanaData.fecha);
    await setDoc(ref, semanaData);
    uiLoading.hide();
    uiToast('Programa guardado', 'success');
  } catch(e) {
    uiLoading.hide();
    await uiAlert('Error al guardar: ' + e.message);
  }
};

// ─────────────────────────────────────────
//   IMPORTACIÓN WOL
// ─────────────────────────────────────────
const WOL_PROXY = 'https://api.allorigins.win/raw?url=';

function wolUrl(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  return `https://wol.jw.org/es/wol/dt/r4/lp-s/${y}/${m}/${d}`;
}

function parseDur(text) {
  const m = text?.match(/\((\d+)\s*min/);
  return m ? parseInt(m[1]) : null;
}

function limpiaTitulo(text) {
  if (!text) return '';
  // Quita el número de párrafo tipo "1. " al inicio si lo hay
  return text.replace(/^\d+\.\s*/, '').trim();
}

function parseWOL(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const s1 = doc.querySelector('#section2');  // Tesoros
  const s2 = doc.querySelector('#section3');  // Ministerio
  const s3 = doc.querySelector('#section4');  // Vida Cristiana

  if (!s1 && !s2 && !s3) return null; // página no reconocida

  const getText = (section, id) =>
    limpiaTitulo(section?.querySelector(id)?.textContent?.trim() || '');

  // ── Tesoros
  const discursoTxt = getText(s1, '#p6');
  const joyasTxt    = getText(s1, '#p7');
  const lecturaTxt  = getText(s1, '#p10');

  // ── Ministerio: p13-p15
  const ministerio = ['#p13', '#p14', '#p15'].map(id => {
    const t = getText(s2, id);
    return t ? { titulo: t, tipo: 'demostracion', duracion: parseDur(t), pubId: null, ayudante: null } : null;
  }).filter(Boolean);

  // ── Vida Cristiana: p17-p20
  // La última parte suele ser el estudio bíblico congregacional
  const vcRaw = ['#p17', '#p18', '#p19', '#p20']
    .map(id => getText(s3, id))
    .filter(Boolean);

  let vidaCristiana = [];
  let estudioTitulo = '';

  if (vcRaw.length > 0) {
    const last = vcRaw[vcRaw.length - 1];
    const esEstudio = /estudio\s+b[íi]blico|libro\s+del\s+a[ñn]o/i.test(last);
    if (esEstudio) {
      estudioTitulo = last;
      vidaCristiana = vcRaw.slice(0, -1).map(t =>
        ({ titulo: t, tipo: 'parte', duracion: parseDur(t), pubId: null })
      );
    } else {
      // No se pudo detectar el estudio: tomar todo como partes
      vidaCristiana = vcRaw.map(t =>
        ({ titulo: t, tipo: 'parte', duracion: parseDur(t), pubId: null })
      );
    }
  }

  // Fallbacks si alguna sección quedó vacía
  if (ministerio.length === 0) {
    ministerio.push({ titulo: '', tipo: 'demostracion', duracion: null, pubId: null, ayudante: null });
    ministerio.push({ titulo: '', tipo: 'demostracion', duracion: null, pubId: null, ayudante: null });
  }
  if (vidaCristiana.length === 0) {
    vidaCristiana.push({ titulo: '', tipo: 'parte', duracion: null, pubId: null });
  }

  return {
    tesoros: {
      discurso:       { titulo: discursoTxt, duracion: parseDur(discursoTxt) || 10, pubId: null },
      joyas:          { titulo: joyasTxt || 'Joyas Espirituales', duracion: parseDur(joyasTxt) || 10, pubId: null },
      lecturaBiblica: { titulo: lecturaTxt, duracion: parseDur(lecturaTxt) || 4, pubId: null, ayudante: null },
    },
    ministerio,
    vidaCristiana,
    estudioBiblico: { titulo: estudioTitulo, duracion: 30, conductor: null, lector: null },
  };
}

async function fetchWOL(fecha) {
  const url = WOL_PROXY + encodeURIComponent(wolUrl(fecha));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Aplica títulos/duraciones importados sin pisar las asignaciones ya hechas
function aplicarWOLaSemana(importado) {
  if (!importado || !semanaData) return;

  const merge = (destParte, srcParte) => {
    if (!destParte || !srcParte) return;
    if (srcParte.titulo) destParte.titulo = srcParte.titulo;
    if (srcParte.duracion) destParte.duracion = srcParte.duracion;
  };

  merge(semanaData.tesoros.discurso,       importado.tesoros.discurso);
  merge(semanaData.tesoros.joyas,          importado.tesoros.joyas);
  merge(semanaData.tesoros.lecturaBiblica, importado.tesoros.lecturaBiblica);

  // Ministerio: reemplaza la lista completa de títulos/duraciones, conserva pubIds
  const minOld = semanaData.ministerio || [];
  semanaData.ministerio = importado.ministerio.map((p, i) => ({
    ...p,
    pubId:    minOld[i]?.pubId    ?? null,
    ayudante: minOld[i]?.ayudante ?? null,
  }));

  // Vida Cristiana: ídem
  const vcOld = semanaData.vidaCristiana || [];
  semanaData.vidaCristiana = importado.vidaCristiana.map((p, i) => ({
    ...p,
    pubId: vcOld[i]?.pubId ?? null,
  }));

  // Estudio Bíblico: solo título
  if (importado.estudioBiblico.titulo) {
    semanaData.estudioBiblico = semanaData.estudioBiblico || {};
    semanaData.estudioBiblico.titulo = importado.estudioBiblico.titulo;
  }
}

window.reimportarDeWOL = async function() {
  if (!semanaData) return;
  const ok = await uiConfirm({
    title: 'Reimportar de WOL',
    msg: 'Se van a actualizar los títulos y duraciones desde wol.jw.org. Las asignaciones de hermanos no se tocan.',
    confirmText: 'Importar',
    cancelText: 'Cancelar',
    type: 'info',
  });
  if (!ok) return;
  uiLoading.show('Importando de WOL…');
  try {
    const html = await fetchWOL(semanaData.fecha);
    const importado = parseWOL(html);
    if (!importado) throw new Error('No se reconoció el formato de la página.');
    aplicarWOLaSemana(importado);
    uiLoading.hide();
    renderSemanaEdit();
    uiToast('Programa importado de WOL', 'success');
  } catch(e) {
    uiLoading.hide();
    await uiAlert(`No se pudo importar: ${e.message}\n\nPodés cargar los títulos manualmente.`);
  }
};

// ─────────────────────────────────────────
//   CREAR SEMANA NUEVA
// ─────────────────────────────────────────
window.crearSemana = async function() {
  const fechaInput = document.getElementById('nueva-fecha').value;
  if (!fechaInput) { uiToast('Seleccioná una fecha', 'error'); return; }

  const fecha = lunesDeDate(fechaInput);
  const nMin  = parseInt(document.getElementById('nueva-n-ministerio').value) || 2;
  const nVC   = parseInt(document.getElementById('nueva-n-vida').value) || 1;

  // Verificar si ya existe
  uiLoading.show('Verificando…');
  try {
    const snap = await getDoc(doc(db, 'congregaciones', congreId, 'vidaministerio', fecha));
    uiLoading.hide();
    if (snap.exists()) {
      const ok = await uiConfirm({
        title: 'Semana existente',
        msg: `Ya hay un programa para la semana del ${fmtDisplay(fecha)}. ¿Querés abrirlo?`,
        confirmText: 'Abrir',
        cancelText: 'Cancelar',
        type: 'info',
      });
      if (ok) {
        semanaData = snap.data();
        document.getElementById('semana-titulo-display').textContent = 'Semana del ' + fmtDisplay(semanaData.fecha);
        renderSemanaEdit();
        showView('view-semana');
      }
      return;
    }
  } catch(e) {
    uiLoading.hide();
    await uiAlert('Error: ' + e.message);
    return;
  }

  // Estructura base (se pisa con datos de WOL si se importa)
  semanaData = {
    fecha,
    cancionApertura:   null,
    cancionIntermedia: null,
    cancionCierre:     null,
    presidente:        null,
    oracionApertura:   null,
    oracionCierre:     null,
    tesoros: {
      discurso:       { titulo: '', duracion: 10, pubId: null },
      joyas:          { titulo: 'Joyas Espirituales', duracion: 10, pubId: null },
      lecturaBiblica: { titulo: '', duracion: 4, pubId: null, ayudante: null },
    },
    ministerio:    Array.from({ length: nMin }, () =>
      ({ titulo: '', tipo: 'demostracion', duracion: null, pubId: null, ayudante: null })
    ),
    vidaCristiana: Array.from({ length: nVC }, () =>
      ({ titulo: '', tipo: 'parte', duracion: null, pubId: null })
    ),
    estudioBiblico: { titulo: '', duracion: 30, conductor: null, lector: null },
  };

  const importarWOL = document.getElementById('nueva-importar-wol')?.checked;
  if (importarWOL) {
    uiLoading.show('Importando programa de WOL…');
    try {
      const html = await fetchWOL(fecha);
      const importado = parseWOL(html);
      if (importado) {
        aplicarWOLaSemana(importado);
        uiToast('Programa importado de WOL', 'success');
      } else {
        uiToast('No se pudo parsear WOL — podés cargar los títulos manualmente', 'error');
      }
    } catch(e) {
      // No bloquear si falla — simplemente abre el editor vacío
      uiToast(`WOL no disponible (${e.message}) — podés cargar manualmente`, 'error');
    }
    uiLoading.hide();
  }

  document.getElementById('semana-titulo-display').textContent = 'Semana del ' + fmtDisplay(fecha);
  renderSemanaEdit();
  showView('view-semana');
};

// ─────────────────────────────────────────
//   INIT
// ─────────────────────────────────────────
(async function init() {
  const savedId     = sessionStorage.getItem('congreId');
  const savedNombre = sessionStorage.getItem('congreNombre');

  if (!savedId) {
    window.location.href = '../index.html';
    return;
  }

  congreId     = savedId;
  congreNombre = savedNombre;
  document.getElementById('cover-congre').textContent = congreNombre || '—';

  try {
    const snap = await getDoc(doc(db, 'congregaciones', congreId));
    if (!snap.exists()) { window.location.href = '../index.html'; return; }
    const data = snap.data();
    pinVM = data.pinVidaMinisterio || '1234';
    await cargarPublicadores();
  } catch(e) {
    console.error('Error al inicializar:', e);
  }

  showView('view-cover');
})();
