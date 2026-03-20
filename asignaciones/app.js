const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxy3WmKkJjSsEXM8qI0lCUdQn76o2v-55zZavlx_lJ_-SVZUip4vFsl0WXAPcPgMfDE/exec';

const ROLES_LABELS = {
  LECTOR:               'Lector',
  SONIDO_1:             'Sonido 1',
  SONIDO_2:             'Sonido 2',
  PLATAFORMA:           'Plataforma',
  MICROFONISTAS_1:      'Micrófonos 1',
  MICROFONISTAS_2:      'Micrófonos 2',
  ACOMODADOR_AUDITORIO: 'Acod. Auditorio',
  ACOMODADOR_ENTRADA:   'Acod. Entrada',
  PRESIDENTE:           'Presidente',
  REVISTAS:             'Revistas',
  PUBLICACIONES:        'Publicaciones',
};

const ROLES = Object.keys(ROLES_LABELS);

const DIA_COLORS = {
  'Lunes':     '#85B7EB',
  'Martes':    '#85B7EB',
  'Miércoles': '#C0DD97',
  'Jueves':    '#FAC775',
  'Viernes':   '#C0DD97',
  'Sábado':    '#CDB4FF',
  'Domingo':   '#F09595',
};

const DIA_BG = {
  'Lunes':     '#0c1e33',
  'Martes':    '#0c1e33',
  'Miércoles': '#1a2e0a',
  'Jueves':    '#2e1e00',
  'Viernes':   '#1a2e0a',
  'Sábado':    '#1e1a2e',
  'Domingo':   '#2e1a1a',
};

/* ─── Estado global ─── */
let hermanos        = {};
let semanaActual    = null;
let programacion    = [];
let semanaOffsetEdit = 0;
let semanaOffsetAuto = 0;
let autoResult      = [];
let esEncargado     = false;
let pinBuffer       = '';

/* ─── Utilidades ─── */
function show(id) { document.getElementById(id).style.display = ''; }
function hide(id) { document.getElementById(id).style.display = 'none'; }

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  show(id);
  const homeBtn = document.getElementById('btn-home');
  if (homeBtn) {
    const showHome = id !== 'view-cover';
    homeBtn.classList.toggle('visible', showHome);
  }
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
  return { monday, sunday: sun, label: `${fmt(monday)} al ${fmt(sun)}`, lunes: fmt(monday) };
}

function parseFecha(str) {
  if (!str) return null;
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? '20' + m[3] : m[3];
  return new Date(`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T00:00:00`);
}

function getNombreDia(fechaStr) {
  const d = parseFecha(fechaStr);
  if (!d) return '';
  return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()];
}

function semanaKeyDeFecha(fechaStr) {
  const d = parseFecha(fechaStr);
  if (!d) return null;
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return `${String(monday.getDate()).padStart(2,'0')}/${String(monday.getMonth()+1).padStart(2,'0')}/${String(monday.getFullYear()).slice(-2)}`;
}

function apiFetch(params) {
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Math.random().toString(36).slice(2);
    const qs = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout al conectar con el servidor'));
    }, 15000);
    function cleanup() {
      clearTimeout(timeout);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    window[cbName] = (data) => { cleanup(); resolve(data); };
    script.src = `${SCRIPT_URL}?${qs}&callback=${cbName}`;
    script.onerror = () => { cleanup(); reject(new Error('Error de red al contactar el servidor')); };
    document.head.appendChild(script);
  });
}

/* ─── Navegación ─── */
function goToCover()          { showView('view-cover'); }
function goToPin()            { openPin(); }
function cerrarSesionEncargado() { esEncargado = false; goToCover(); }

async function goToVerSemana() {
  showView('view-semana');
  show('semana-loading'); hide('semana-content'); hide('semana-error');
  try {
    const data = await apiFetch({ action: 'getSemanaActual' });
    semanaActual = data.semanaActual;
    programacion = data.rows || [];
    document.getElementById('semana-label').textContent = `Semana del ${semanaActual || '—'}`;
    hide('semana-loading');
    renderSemana(programacion, 'semana-reuniones');
    show('semana-content');
  } catch(err) {
    hide('semana-loading');
    document.getElementById('semana-error').innerHTML = `<div class="error-wrap">Error al cargar: ${err.message}. <button class="btn-secondary" style="font-size:12px;padding:4px 10px;margin-left:8px;" onclick="goToVerSemana()">Reintentar</button></div>`;
    show('semana-error');
  }
}

async function goToBuscarHermano() {
  showView('view-buscar');
  document.getElementById('search-input').value = '';
  hide('search-suggestions');
  hide('buscar-result');
  hide('buscar-empty');
  if (Object.keys(hermanos).length === 0) {
    try {
      hermanos = await apiFetch({ action: 'getHermanos' });
    } catch(e) {}
  }
}

function goToEncargado() { showView('view-encargado'); }

async function goToEditar() {
  showView('view-editar');
  semanaOffsetEdit = 0;
  await cargarEditar();
}

async function goToAutomatico() {
  showView('view-automatico');
  semanaOffsetAuto = 0;
  hide('auto-loading'); hide('auto-preview'); hide('auto-guardar-wrap');
  document.getElementById('auto-status').textContent = '';
  autoResult = [];
  updateSemanaAutoInfo();
  if (Object.keys(hermanos).length === 0) {
    try { hermanos = await apiFetch({ action: 'getHermanos' }); } catch(e) {}
  }
}

async function goToGenerarImagen() {
  showView('view-imagen');
  show('imagen-loading'); hide('imagen-content');
  try {
    const data = await apiFetch({ action: 'getSemanaActual' });
    const rows = data.rows || [];
    document.getElementById('imagen-semana-label').textContent = `Semana del ${data.semanaActual || '—'}`;
    document.getElementById('imagen-titulo').textContent = `Asignaciones — Semana del ${data.semanaActual || ''}`;
    hide('imagen-loading');
    renderTablaImagen(rows);
    show('imagen-content');
  } catch(err) {
    hide('imagen-loading');
  }
}

/* ─── PIN ─── */
function openPin() {
  pinBuffer = '';
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
  show('pin-modal');
}

function pinPress(d) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += d;
  updatePinDots();
  if (pinBuffer.length === 4) setTimeout(checkPin, 150);
}

function pinDelete() {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pd' + i);
    const filled = i < pinBuffer.length;
    dot.classList.toggle('filled', filled);
    dot.style.borderColor = filled ? '#7F77DD' : '#555';
    dot.style.background  = filled ? '#7F77DD' : 'transparent';
  }
}

async function checkPin() {
  try {
    const data = await apiFetch({ action: 'checkPin', pin: pinBuffer });
    if (data.ok) {
      hide('pin-modal');
      esEncargado = true;
      pinBuffer = '';
      goToEncargado();
    } else {
      document.getElementById('pin-error').textContent = 'PIN incorrecto, intentá de nuevo';
      pinBuffer = '';
      updatePinDots();
    }
  } catch(e) {
    document.getElementById('pin-error').textContent = 'Error al verificar PIN';
    pinBuffer = '';
    updatePinDots();
  }
}

function pinCancel() { hide('pin-modal'); pinBuffer = ''; }

/* ─── Render semana ─── */
function renderSemana(rows, containerId) {
  const c = document.getElementById(containerId);
  c.innerHTML = '';

  if (!rows || rows.length === 0) {
    c.innerHTML = '<div class="empty-state"><p>No hay programación cargada para esta semana.</p></div>';
    return;
  }

  rows.forEach(row => {
    const dia = row.dia || getNombreDia(row.fecha);
    const diaColor = DIA_COLORS[dia] || '#eee';
    const diaBg    = DIA_BG[dia] || '#1e1e1e';

    const card = document.createElement('div');
    card.className = 'reunion-card';

    const rolesHTML = ROLES.map(r => {
      const val = row[r] || '';
      if (!val) return '';
      return `<div class="rol-row">
        <span class="rol-label">${ROLES_LABELS[r]}</span>
        <span class="rol-valor">${val}</span>
      </div>`;
    }).filter(Boolean).join('');

    card.innerHTML = `
      <div class="reunion-header" style="background:${diaBg};border-left:3px solid ${diaColor};">
        <span class="reunion-dia" style="color:${diaColor};">${dia}</span>
        <span class="reunion-fecha">${row.fecha || ''}</span>
      </div>
      <div class="roles-list">${rolesHTML || '<div style="color:#666;font-size:13px;padding:8px 0;">Sin datos cargados</div>'}</div>`;
    c.appendChild(card);
  });
}

/* ─── Buscar hermano ─── */
function getAllHermanos() {
  const set = new Set();
  Object.values(hermanos).forEach(lista => {
    if (Array.isArray(lista)) lista.forEach(h => { if (h) set.add(h); });
  });
  return [...set].sort();
}

function filtrarHermanos() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const sugg = document.getElementById('search-suggestions');
  hide('buscar-result');
  hide('buscar-empty');

  if (q.length < 2) { hide('search-suggestions'); return; }

  const todos = getAllHermanos();
  const matches = todos.filter(h => h.toLowerCase().includes(q));

  if (matches.length === 0) { hide('search-suggestions'); return; }

  sugg.innerHTML = matches.slice(0, 8).map(h =>
    `<button class="sugg-item" onclick="buscarHermano('${h}')">${h}</button>`
  ).join('');
  show('search-suggestions');
}

async function buscarHermano(nombre) {
  hide('search-suggestions');
  document.getElementById('search-input').value = nombre;
  hide('buscar-empty');

  try {
    const data = await apiFetch({ action: 'getSemanaActual' });
    const rows = data.rows || [];

    const asignaciones = [];
    rows.forEach(row => {
      const dia = row.dia || getNombreDia(row.fecha);
      ROLES.forEach(r => {
        const val = (row[r] || '').trim();
        if (val.toLowerCase() === nombre.toLowerCase()) {
          asignaciones.push({ dia, fecha: row.fecha, rol: ROLES_LABELS[r] });
        }
      });
    });

    const res = document.getElementById('buscar-result');
    if (asignaciones.length === 0) {
      show('buscar-empty');
      return;
    }

    res.innerHTML = `
      <div class="buscar-nombre">${nombre}</div>
      <div class="buscar-semana">Semana del ${data.semanaActual || '—'}</div>
      ${asignaciones.map(a => {
        const diaColor = DIA_COLORS[a.dia] || '#eee';
        const diaBg    = DIA_BG[a.dia] || '#1e1e1e';
        return `<div class="asig-card" style="border-left:3px solid ${diaColor};background:${diaBg}20;">
          <span class="asig-dia" style="color:${diaColor};">${a.dia}</span>
          <span class="asig-fecha">${a.fecha}</span>
          <span class="asig-rol">${a.rol}</span>
        </div>`;
      }).join('')}`;
    show('buscar-result');
  } catch(e) {
    show('buscar-empty');
  }
}

/* ─── Editar programación ─── */
function updateSemanaEditInfo() {
  const w = getWeekDates(semanaOffsetEdit);
  document.getElementById('editar-semana-info').textContent = `Semana del ${w.label}`;
  document.getElementById('editar-semana-label').textContent = `Semana del ${w.label}`;
}

async function cambiarSemanaEdit(dir) {
  semanaOffsetEdit += dir;
  await cargarEditar();
}

async function cargarEditar() {
  updateSemanaEditInfo();
  show('editar-loading');
  document.getElementById('editar-content').innerHTML = '';
  document.getElementById('editar-status').textContent = '';

  const w = getWeekDates(semanaOffsetEdit);

  try {
    if (Object.keys(hermanos).length === 0) {
      hermanos = await apiFetch({ action: 'getHermanos' });
    }
    const data = await apiFetch({ action: 'getProgramacion', semana: w.lunes });
    const rows = data.rows || [];
    hide('editar-loading');
    renderEditar(rows, w);
  } catch(err) {
    hide('editar-loading');
    document.getElementById('editar-content').innerHTML = `<div class="error-wrap">Error: ${err.message}</div>`;
  }
}

function renderEditar(rows, week) {
  const c = document.getElementById('editar-content');
  c.innerHTML = '';

  // Días de la semana (miércoles y sábado por defecto)
  const diasSemana = [
    { dia: 'Miércoles', fecha: getFechaOfWeek(week.monday, 3) },
    { dia: 'Sábado',    fecha: getFechaOfWeek(week.monday, 6) },
  ];

  diasSemana.forEach(({ dia, fecha }) => {
    const existing = rows.find(r => r.fecha === fecha) || {};
    const diaColor = DIA_COLORS[dia] || '#eee';
    const diaBg    = DIA_BG[dia] || '#1e1e1e';

    const div = document.createElement('div');
    div.className = 'edit-card';
    div.dataset.fecha = fecha;
    div.dataset.dia = dia;

    const rolesHTML = ROLES.map(r => {
      const lista = hermanos[r] || [];
      const valActual = existing[r] || '';
      const opts = `<option value="">— Sin asignar —</option>` +
        lista.map(h => `<option value="${h}" ${h === valActual ? 'selected' : ''}>${h}</option>`).join('');
      return `<div class="edit-rol-row">
        <label class="edit-rol-label">${ROLES_LABELS[r]}</label>
        <select class="edit-rol-select" data-rol="${r}">${opts}</select>
      </div>`;
    }).join('');

    div.innerHTML = `
      <div class="reunion-header" style="background:${diaBg};border-left:3px solid ${diaColor};margin-bottom:12px;">
        <span class="reunion-dia" style="color:${diaColor};">${dia}</span>
        <span class="reunion-fecha">${fecha}</span>
      </div>
      ${rolesHTML}`;
    c.appendChild(div);
  });
}

function getFechaOfWeek(monday, dayOffset) {
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayOffset - 1);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
}

async function guardarEdicion() {
  const btn    = document.querySelector('.btn-guardar');
  const status = document.getElementById('editar-status');
  btn.disabled = true;
  status.style.color = '#888';
  status.textContent = 'Guardando...';

  const cards = document.querySelectorAll('#editar-content .edit-card');
  const data  = [];
  cards.forEach(card => {
    const entry = { fecha: card.dataset.fecha, dia: card.dataset.dia };
    card.querySelectorAll('select[data-rol]').forEach(sel => {
      entry[sel.dataset.rol] = sel.value;
    });
    data.push(entry);
  });

  try {
    await apiFetch({ action: 'saveProgramacion', data: JSON.stringify(data) });
    status.style.color = '#5DCAA5';
    status.textContent = '✓ Guardado correctamente';
  } catch(err) {
    status.style.color = '#F09595';
    status.textContent = 'Error: ' + err.message;
  }
  btn.disabled = false;
}

/* ─── Generar automático ─── */
function updateSemanaAutoInfo() {
  const w = getWeekDates(semanaOffsetAuto);
  document.getElementById('auto-semana-info').textContent = `Semana del ${w.label}`;
}

function cambiarSemanaAuto(dir) {
  semanaOffsetAuto += dir;
  updateSemanaAutoInfo();
  hide('auto-preview');
  hide('auto-guardar-wrap');
  autoResult = [];
}

function generarAutomatico() {
  if (Object.keys(hermanos).length === 0) {
    document.getElementById('auto-status').textContent = 'Cargando hermanos...';
    return;
  }

  show('auto-loading');
  hide('auto-preview');
  hide('auto-guardar-wrap');

  const week = getWeekDates(semanaOffsetAuto);

  const diasSemana = [
    { dia: 'Miércoles', fecha: getFechaOfWeek(week.monday, 3) },
    { dia: 'Sábado',    fecha: getFechaOfWeek(week.monday, 6) },
  ];

  autoResult = diasSemana.map(({ dia, fecha }) => {
    const entry = { fecha, dia };
    // Rotación simple: shuffle la lista y tomamos el primero
    ROLES.forEach(r => {
      const lista = hermanos[r] || [];
      if (lista.length === 0) { entry[r] = ''; return; }
      // Pseudo-rotación basada en día + rol para variedad reproducible
      const seed = (fecha.split('/')[0] * 17 + ROLES.indexOf(r) * 7) % lista.length;
      entry[r] = lista[seed] || lista[0];
    });
    return entry;
  });

  hide('auto-loading');
  renderAutoPreview(autoResult);
  show('auto-preview');
  show('auto-guardar-wrap');
}

function renderAutoPreview(rows) {
  const c = document.getElementById('auto-preview');
  c.innerHTML = '<div style="font-size:12px;color:#888;margin-bottom:10px;">Vista previa — revisá antes de guardar</div>';
  rows.forEach(row => {
    const dia = row.dia;
    const diaColor = DIA_COLORS[dia] || '#eee';
    const diaBg    = DIA_BG[dia] || '#1e1e1e';
    const rolesHTML = ROLES.map(r => row[r] ? `
      <div class="rol-row">
        <span class="rol-label">${ROLES_LABELS[r]}</span>
        <span class="rol-valor">${row[r]}</span>
      </div>` : '').join('');
    c.innerHTML += `
      <div class="reunion-card">
        <div class="reunion-header" style="background:${diaBg};border-left:3px solid ${diaColor};">
          <span class="reunion-dia" style="color:${diaColor};">${dia}</span>
          <span class="reunion-fecha">${row.fecha}</span>
        </div>
        <div class="roles-list">${rolesHTML}</div>
      </div>`;
  });
}

async function guardarAutomatico() {
  const status = document.getElementById('auto-status');
  status.style.color = '#888';
  status.textContent = 'Guardando...';
  try {
    await apiFetch({ action: 'saveProgramacion', data: JSON.stringify(autoResult) });
    status.style.color = '#5DCAA5';
    status.textContent = '✓ Guardado en la planilla';
  } catch(err) {
    status.style.color = '#F09595';
    status.textContent = 'Error: ' + err.message;
  }
}

/* ─── Tabla imagen ─── */
function renderTablaImagen(rows) {
  const c = document.getElementById('tabla-reuniones');
  c.innerHTML = '';
  if (!rows || rows.length === 0) {
    c.innerHTML = '<div style="color:#888;text-align:center;padding:20px;font-size:13px;">Sin programación esta semana</div>';
    return;
  }
  rows.forEach(row => {
    const dia = row.dia || getNombreDia(row.fecha);
    const diaColor = DIA_COLORS[dia] || '#eee';
    const rolesHTML = ROLES.map(r => {
      const val = row[r] || '';
      if (!val) return '';
      return `<tr><td class="tabla-rol">${ROLES_LABELS[r]}</td><td class="tabla-val">${val}</td></tr>`;
    }).filter(Boolean).join('');

    c.innerHTML += `
      <div class="tabla-reunion-wrap">
        <div class="tabla-dia-header" style="color:${diaColor};border-bottom:1px solid ${diaColor}30;">
          ${dia} <span style="font-size:11px;font-weight:400;color:#888;margin-left:8px;">${row.fecha}</span>
        </div>
        <table class="tabla-roles"><tbody>${rolesHTML}</tbody></table>
      </div>`;
  });
}

function guardarImagen() {
  const el = document.getElementById('card-tabla');
  const orig = el.style.width;
  el.style.width = '700px';
  html2canvas(el, { backgroundColor: '#1e1e1e', scale: 1.5, width: 700 }).then(canvas => {
    el.style.width = orig;
    const link = document.createElement('a');
    link.download = 'asignaciones-semana.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  });
}
