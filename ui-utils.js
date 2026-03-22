/* ═══════════════════════════════════════════════════════
   ui-utils.js  v2 —  Modales · Pickers · Logo · Loading
   Congregación Sur · Territory App
   ═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   CSS GLOBAL
───────────────────────────────────────── */
(function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
/* ── Modal base ── */
.ui-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000; padding: 1rem;
  animation: uiFadeIn 0.15s ease;
}
@keyframes uiFadeIn { from { opacity:0 } to { opacity:1 } }

.ui-modal {
  background: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 20px;
  padding: 1.75rem 1.5rem 1.5rem;
  width: 100%; max-width: 340px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  animation: uiSlideUp 0.18s ease;
}
@keyframes uiSlideUp { from { transform:translateY(12px); opacity:0 } to { transform:translateY(0); opacity:1 } }

.ui-modal-icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px; font-size: 22px;
}
.ui-modal-icon.warn   { background: rgba(239,159,39,0.15); }
.ui-modal-icon.danger { background: rgba(240,149,149,0.15); }
.ui-modal-icon.info   { background: rgba(29,158,117,0.15); }

.ui-modal-title {
  font-size: 17px; font-weight: 600; color: #eee;
  text-align: center; margin-bottom: 8px;
}
.ui-modal-msg {
  font-size: 14px; color: #aaa; text-align: center;
  line-height: 1.5; margin-bottom: 20px;
}
.ui-modal-btns { display: flex; gap: 8px; }
.ui-modal-btns button {
  flex: 1; padding: 11px;
  font-size: 14px; font-weight: 500;
  border-radius: 12px; border: none; cursor: pointer;
  transition: filter 0.1s, transform 0.1s;
}
.ui-modal-btns button:active { transform: scale(0.97); }
.ui-btn-cancel  { background: #333; color: #aaa; border: 0.5px solid #444 !important; }
.ui-btn-cancel:hover { filter: brightness(1.15); }
.ui-btn-confirm-warn   { background: #EF9F27; color: #fff; }
.ui-btn-confirm-danger { background: #A32D2D; color: #F09595; }
.ui-btn-confirm-info   { background: #1D9E75; color: #fff; }
.ui-btn-confirm-warn:hover,
.ui-btn-confirm-danger:hover,
.ui-btn-confirm-info:hover { filter: brightness(1.1); }
.ui-btn-ok { background: #333; color: #eee; border: 0.5px solid #555 !important; }
.ui-btn-ok:hover { filter: brightness(1.15); }

/* ═══════════════════════════════════════════
   BOTTOM SHEET base (date, time, conductor)
═══════════════════════════════════════════ */
.bs-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 9100;
  animation: uiFadeIn 0.15s ease;
}
@media (min-height: 600px) {
  .bs-overlay { align-items: center; padding: 1rem; }
}
.bs-card {
  background: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 24px 24px 0 0;
  width: 100%; max-width: 380px;
  box-shadow: 0 -16px 48px rgba(0,0,0,0.5);
  animation: bsSlideUp 0.22s cubic-bezier(.22,.68,0,1.2);
  user-select: none; overflow: hidden;
}
@media (min-height: 600px) {
  .bs-card { border-radius: 24px; box-shadow: 0 24px 64px rgba(0,0,0,0.6); }
}
@keyframes bsSlideUp { from { transform:translateY(40px); opacity:0 } to { transform:translateY(0); opacity:1 } }

.bs-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: #444; margin: 12px auto 0;
}
.bs-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 10px;
}
.bs-title { font-size: 15px; font-weight: 600; color: #eee; }
.bs-close-btn {
  width: 30px; height: 30px; border-radius: 8px;
  border: 0.5px solid #444; background: #1e1e1e; color: #888;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 16px; transition: background 0.1s;
}
.bs-close-btn:hover { background: #2e2e2e; color: #eee; }

.bs-footer {
  display: flex; gap: 8px; padding: 12px 16px 16px;
}
.bs-footer button {
  flex: 1; padding: 11px; font-size: 14px; font-weight: 500;
  border-radius: 12px; border: none; cursor: pointer; transition: filter 0.1s;
}
.bs-btn-cancel { background: #333; color: #aaa; border: 0.5px solid #444 !important; }
.bs-btn-cancel:hover { filter: brightness(1.15); }
.bs-btn-ok { background: #185FA5; color: #fff; }
.bs-btn-ok:hover { filter: brightness(1.1); }

/* ═══════════════════════════════════════════
   DATE PICKER
═══════════════════════════════════════════ */
.dp-nav-btn {
  width: 34px; height: 34px; border-radius: 10px;
  border: 0.5px solid #444; background: #1e1e1e; color: #aaa;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 16px; transition: background 0.1s, color 0.1s;
}
.dp-nav-btn:hover { background: #2e2e2e; color: #eee; }
.dp-month-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px 10px;
}
.dp-month-title { font-size: 14px; font-weight: 600; color: #eee; }
.dp-weekdays {
  display: grid; grid-template-columns: repeat(7,1fr);
  text-align: center; padding: 0 10px; margin-bottom: 4px;
}
.dp-wd { font-size: 11px; font-weight: 600; color: #555; padding: 4px 0; }
.dp-days {
  display: grid; grid-template-columns: repeat(7,1fr);
  gap: 2px; padding: 0 10px;
}
.dp-day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 500; color: #ccc;
  border-radius: 10px; cursor: pointer;
  transition: background 0.1s; border: none; background: transparent;
}
.dp-day:hover:not(.dp-day-other):not(.dp-day-disabled) { background: #333; color: #eee; }
.dp-day-other    { color: #3a3a3a; cursor: default; }
.dp-day-disabled { color: #333; cursor: not-allowed; }
.dp-day-today    { color: #97C459; font-weight: 700; }
.dp-day-selected { background: #185FA5 !important; color: #fff !important; font-weight: 700; }

/* ═══════════════════════════════════════════
   TIME PICKER
═══════════════════════════════════════════ */
.tp-display {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; padding: 4px 16px 16px;
}
.tp-display-num {
  font-size: 52px; font-weight: 300; color: #eee;
  min-width: 80px; text-align: center; line-height: 1;
  background: #1e1e1e; border-radius: 14px; padding: 8px 12px;
  cursor: pointer; transition: background 0.1s;
}
.tp-display-num.active { background: #185FA5; color: #fff; }
.tp-display-num:hover:not(.active) { background: #2a2a2a; }
.tp-display-sep { font-size: 44px; font-weight: 300; color: #555; line-height: 1; }
.tp-numpad {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 8px;
  padding: 0 16px 4px;
}
.tp-num-btn {
  padding: 14px; font-size: 20px; font-weight: 400; color: #eee;
  background: #1e1e1e; border: none; border-radius: 12px; cursor: pointer;
  transition: background 0.1s, transform 0.08s;
}
.tp-num-btn:hover { background: #2e2e2e; }
.tp-num-btn:active { transform: scale(0.93); background: #333; }
.tp-num-btn.tp-del { color: #F09595; background: #2e1a1a; }
.tp-num-btn.tp-del:hover { background: #3a2020; }
.tp-num-btn.tp-empty { background: transparent; cursor: default; }

/* ═══════════════════════════════════════════
   CONDUCTOR PICKER
═══════════════════════════════════════════ */
.cp-search-wrap {
  padding: 0 14px 8px;
  position: relative;
}
.cp-search-input {
  width: 100%; padding: 9px 12px 9px 36px;
  background: #1e1e1e; border: 0.5px solid #444; border-radius: 10px;
  color: #eee; font-size: 14px; outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.cp-search-input:focus { border-color: #666; }
.cp-search-icon {
  position: absolute; left: 26px; top: 50%; transform: translateY(-50%);
  color: #555; pointer-events: none;
  display: flex; align-items: center; justify-content: center;
  width: 16px; height: 16px;
}
.cp-list {
  max-height: 280px; overflow-y: auto;
  padding: 0 6px 10px;
}
.cp-list::-webkit-scrollbar { width: 3px; }
.cp-list::-webkit-scrollbar-track { background: transparent; }
.cp-list::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 2px; }
.cp-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 10px; cursor: pointer;
  transition: background 0.1s; border: none; background: transparent;
  width: 100%; text-align: left;
}
.cp-item:hover { background: #2a2a2a; }
.cp-item.selected { background: rgba(24,95,165,0.18); }
.cp-item-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: #2e2e2e; border: 1px solid #3a3a3a;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #888;
  text-transform: uppercase;
}
.cp-item.selected .cp-item-avatar {
  background: rgba(24,95,165,0.25); border-color: #185FA5; color: #85B7EB;
}
.cp-item-name { font-size: 14px; font-weight: 500; color: #ddd; flex: 1; }
.cp-item.selected .cp-item-name { color: #eee; }
.cp-item-check {
  color: #185FA5; flex-shrink: 0;
  opacity: 0; transition: opacity 0.1s;
  display: flex; align-items: center;
}
.cp-item.selected .cp-item-check { opacity: 1; }
.cp-empty { text-align: center; padding: 28px 16px; color: #555; font-size: 13px; }
.cp-divider {
  height: 0.5px; background: #2e2e2e;
  margin: 2px 10px 6px;
}
.cp-sin-asignar {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 10px; cursor: pointer;
  border: none; background: transparent; width: 100%; text-align: left;
  transition: background 0.1s;
}
.cp-sin-asignar:hover { background: #2a2a2a; }
.cp-sin-asignar-icon {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: #252525; border: 1px solid #333;
  display: flex; align-items: center; justify-content: center;
}
.cp-sin-asignar-txt { font-size: 13px; color: #666; }

/* ── Fake input (reemplaza select/date/time nativos) ── */
.ui-fake-input {
  width: 100%; font-size: 13px; padding: 6px 8px;
  border: 0.5px solid #555; border-radius: 8px;
  background: #1e1e1e; color: #eee;
  cursor: pointer; text-align: left;
  display: flex; align-items: center; gap: 6px;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.ui-fake-input:hover { border-color: #777; }
.ui-fake-input.empty { color: #555; }
.ui-fake-input-icon { font-size: 14px; flex-shrink: 0; opacity: 0.6; }

/* ═══════════════════════════════════════════
   LOADING OVERLAY
═══════════════════════════════════════════ */
.ui-loading-overlay {
  position: fixed; inset: 0;
  background: rgba(10,10,10,0.82);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  z-index: 9500;
  backdrop-filter: blur(4px);
  animation: uiFadeIn 0.2s ease;
  gap: 18px;
}
.ui-loading-overlay.hiding {
  animation: uiFadeOut 0.25s ease forwards;
}
@keyframes uiFadeOut { from { opacity:1 } to { opacity:0 } }

.ui-loading-spinner {
  width: 52px; height: 52px;
  position: relative;
}
.ui-loading-spinner::before,
.ui-loading-spinner::after {
  content: ''; position: absolute; border-radius: 50%;
}
.ui-loading-spinner::before {
  inset: 0;
  border: 3px solid #2a2a2a;
}
.ui-loading-spinner::after {
  inset: 0;
  border: 3px solid transparent;
  border-top-color: #7F77DD;
  border-right-color: #5B8DDE;
  animation: uiSpin 0.7s linear infinite;
}
@keyframes uiSpin { to { transform: rotate(360deg); } }

.ui-loading-text {
  font-size: 14px; color: #888;
  font-family: system-ui, sans-serif;
  letter-spacing: 0.02em;
}

/* ═══════════════════════════════════════════
   LOGO SVG (hexágono violeta estilo jw.org)
═══════════════════════════════════════════ */
.cs-logo-svg {
  display: block;
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
.ui-toast-container {
  position: fixed; bottom: 24px; left: 50%;
  transform: translateX(-50%);
  z-index: 9800; display: flex; flex-direction: column;
  align-items: center; gap: 8px; pointer-events: none;
}
.ui-toast {
  background: #2a2a2a; border: 1px solid #3a3a3a;
  border-radius: 30px; padding: 10px 20px;
  font-size: 13px; font-weight: 500; color: #eee;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  animation: toastIn 0.2s cubic-bezier(.22,.68,0,1.2);
  white-space: nowrap;
}
.ui-toast.success { border-color: #1D9E75; color: #5DCAA5; }
.ui-toast.error   { border-color: #A32D2D; color: #F09595; }
.ui-toast.hiding  { animation: toastOut 0.2s ease forwards; }
@keyframes toastIn  { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
@keyframes toastOut { from { opacity:1 } to { opacity:0; transform:translateY(8px) } }
`;
  document.head.appendChild(style);
})();

/* ─────────────────────────────────────────
   LOGO SVG — Hexágono violeta
───────────────────────────────────────── */
window.CS_LOGO_SVG = `<svg class="cs-logo-svg" width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="csLogoGrad" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#8B7FE8"/>
      <stop offset="50%" stop-color="#6B5FD4"/>
      <stop offset="100%" stop-color="#4A44A5"/>
    </linearGradient>
    <linearGradient id="csIconGrad" x1="20" y1="20" x2="52" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C4BFFF"/>
      <stop offset="100%" stop-color="#8B7FE8"/>
    </linearGradient>
    <filter id="csShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#4A44A5" flood-opacity="0.45"/>
    </filter>
  </defs>
  <!-- Hexágono -->
  <path d="M36 4 L64 20 L64 52 L36 68 L8 52 L8 20 Z"
    fill="url(#csLogoGrad)" filter="url(#csShadow)"/>
  <!-- Borde interior sutil -->
  <path d="M36 8 L61 22.5 L61 49.5 L36 64 L11 49.5 L11 22.5 Z"
    fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <!-- Personas (dos figuras) -->
  <!-- Persona izquierda -->
  <circle cx="28" cy="27" r="6" fill="url(#csIconGrad)"/>
  <path d="M16 48 C16 40 22 36 28 36 C31 36 33.5 37.2 35.5 39" stroke="url(#csIconGrad)" stroke-width="3" stroke-linecap="round" fill="none"/>
  <!-- Persona derecha (más grande, delante) -->
  <circle cx="40" cy="25" r="7" fill="url(#csIconGrad)"/>
  <path d="M26 50 C27 41.5 33 37 40 37 C47 37 53 41.5 54 50" stroke="url(#csIconGrad)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
</svg>`;

/* Helper para insertar el logo donde haya .cs-logo-placeholder */
window.insertLogos = function() {
  document.querySelectorAll('.cs-logo-placeholder').forEach(el => {
    el.innerHTML = CS_LOGO_SVG;
  });
};
document.addEventListener('DOMContentLoaded', insertLogos);

/* ─────────────────────────────────────────
   LOADING OVERLAY
───────────────────────────────────────── */
let _loadingEl = null;

window.uiLoading = {
  show(text = 'Cargando...') {
    if (_loadingEl) return;
    _loadingEl = document.createElement('div');
    _loadingEl.className = 'ui-loading-overlay';
    _loadingEl.innerHTML = `
      <div class="ui-loading-spinner"></div>
      <div class="ui-loading-text" id="ui-loading-text">${text}</div>`;
    document.body.appendChild(_loadingEl);
  },
  setText(text) {
    const el = document.getElementById('ui-loading-text');
    if (el) el.textContent = text;
  },
  hide() {
    if (!_loadingEl) return;
    _loadingEl.classList.add('hiding');
    setTimeout(() => {
      if (_loadingEl) { _loadingEl.remove(); _loadingEl = null; }
    }, 260);
  }
};

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
(function() {
  let container;
  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'ui-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }
  window.uiToast = function(msg, type = '', duration = 2500) {
    const c = getContainer();
    const t = document.createElement('div');
    t.className = 'ui-toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => {
      t.classList.add('hiding');
      setTimeout(() => t.remove(), 220);
    }, duration);
  };
})();

/* ─────────────────────────────────────────
   MODAL CONFIRM
───────────────────────────────────────── */
window.uiConfirm = function({ title = '¿Estás seguro?', msg = '', confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warn' } = {}) {
  return new Promise(resolve => {
    const icons = { warn: '⚠️', danger: '🗑️', info: 'ℹ️' };
    const overlay = document.createElement('div');
    overlay.className = 'ui-overlay';
    overlay.innerHTML = `
      <div class="ui-modal">
        <div class="ui-modal-icon ${type}"><span>${icons[type] || '⚠️'}</span></div>
        <div class="ui-modal-title">${title}</div>
        ${msg ? `<div class="ui-modal-msg">${msg}</div>` : ''}
        <div class="ui-modal-btns">
          <button class="ui-btn-cancel">${cancelText}</button>
          <button class="ui-btn-confirm-${type}">${confirmText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const [btnCancel, btnConfirm] = overlay.querySelectorAll('button');
    const close = val => { overlay.remove(); resolve(val); };
    btnCancel.onclick  = () => close(false);
    btnConfirm.onclick = () => close(true);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
  });
};

/* ─────────────────────────────────────────
   MODAL ALERT
───────────────────────────────────────── */
window.uiAlert = function(msg, title = 'Atención') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'ui-overlay';
    overlay.innerHTML = `
      <div class="ui-modal">
        <div class="ui-modal-icon info"><span>ℹ️</span></div>
        <div class="ui-modal-title">${title}</div>
        <div class="ui-modal-msg">${msg}</div>
        <div class="ui-modal-btns">
          <button class="ui-btn-ok" style="flex:1;">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const btn = overlay.querySelector('button');
    const close = () => { overlay.remove(); resolve(); };
    btn.onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  });
};

/* ─────────────────────────────────────────
   DATE PICKER
───────────────────────────────────────── */
window.uiDatePicker = function({ value = '', min = null, label = 'Elegir fecha' } = {}) {
  return new Promise(resolve => {
    const today = new Date(); today.setHours(0,0,0,0);
    let viewYear, viewMonth, selDate;
    if (value) {
      const d = new Date(value + 'T00:00:00');
      viewYear = d.getFullYear(); viewMonth = d.getMonth(); selDate = new Date(d);
    } else {
      viewYear = today.getFullYear(); viewMonth = today.getMonth(); selDate = null;
    }
    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    document.body.appendChild(overlay);
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const DS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];
    function pad(n) { return String(n).padStart(2,'0'); }
    function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
    function minDate() { return min ? new Date(min + 'T00:00:00') : null; }
    function render() {
      const firstDay = new Date(viewYear, viewMonth, 1);
      const lastDay  = new Date(viewYear, viewMonth + 1, 0);
      let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6;
      const cells = [];
      for (let i = startDow - 1; i >= 0; i--) cells.push({ d: new Date(viewYear, viewMonth, -i), other: true });
      for (let i = 1; i <= lastDay.getDate(); i++) cells.push({ d: new Date(viewYear, viewMonth, i), other: false });
      while (cells.length % 7 !== 0) cells.push({ d: new Date(viewYear, viewMonth + 1, cells.length - lastDay.getDate() - startDow + 1), other: true });
      const mn = minDate();
      const daysHTML = cells.map(({ d, other }) => {
        const isToday   = !other && d.toDateString() === today.toDateString();
        const isSel     = selDate && !other && d.toDateString() === selDate.toDateString();
        const isDisabled = mn && d < mn;
        let cls = 'dp-day';
        if (other) cls += ' dp-day-other';
        else if (isDisabled) cls += ' dp-day-disabled';
        else if (isToday) cls += ' dp-day-today';
        if (isSel) cls += ' dp-day-selected';
        return `<button class="${cls}" data-date="${toISO(d)}" ${isDisabled||other?'disabled':''}>${d.getDate()}</button>`;
      }).join('');
      overlay.innerHTML = `
        <div class="bs-card">
          <div class="bs-handle"></div>
          <div class="bs-header">
            <div class="bs-title">${label}</div>
            <button class="bs-close-btn">✕</button>
          </div>
          <div class="dp-month-header">
            <button class="dp-nav-btn" id="dp-prev">‹</button>
            <div class="dp-month-title">${MESES[viewMonth]} ${viewYear}</div>
            <button class="dp-nav-btn" id="dp-next">›</button>
          </div>
          <div class="dp-weekdays">${DS.map(d=>`<div class="dp-wd">${d}</div>`).join('')}</div>
          <div class="dp-days">${daysHTML}</div>
          <div class="bs-footer">
            <button class="bs-btn-cancel">Cancelar</button>
            <button class="bs-btn-ok" ${!selDate?'disabled style="opacity:.4;cursor:not-allowed"':''}>Listo</button>
          </div>
        </div>`;
      overlay.querySelector('#dp-prev').onclick = () => { viewMonth--; if (viewMonth<0){viewMonth=11;viewYear--;} render(); };
      overlay.querySelector('#dp-next').onclick = () => { viewMonth++; if (viewMonth>11){viewMonth=0;viewYear++;} render(); };
      overlay.querySelectorAll('.dp-day:not([disabled])').forEach(btn => {
        btn.onclick = () => { selDate = new Date(btn.dataset.date + 'T00:00:00'); render(); };
      });
      overlay.querySelector('.bs-close-btn').onclick = () => { overlay.remove(); resolve(null); };
      overlay.querySelector('.bs-btn-cancel').onclick = () => { overlay.remove(); resolve(null); };
      overlay.querySelector('.bs-btn-ok').onclick = () => {
        if (!selDate) return;
        overlay.remove(); resolve(toISO(selDate));
      };
      overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
    }
    render();
  });
};

/* ─────────────────────────────────────────
   TIME PICKER
───────────────────────────────────────── */
window.uiTimePicker = function({ value = '', label = 'Elegir hora' } = {}) {
  return new Promise(resolve => {
    let hh = '', mm = '', editing = 'h', buffer = '';
    if (value && value.includes(':')) [hh, mm] = value.split(':');
    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    document.body.appendChild(overlay);
    function dispH() { return hh !== '' ? String(hh).padStart(2,'0') : '--'; }
    function dispM() { return mm !== '' ? String(mm).padStart(2,'0') : '--'; }
    function validate() {
      let h = parseInt(hh), m = parseInt(mm);
      if (isNaN(h)||h<0||h>23) hh='';
      if (isNaN(m)||m<0||m>59) mm='';
    }
    function render() {
      const ok = hh !== '' && mm !== '';
      overlay.innerHTML = `
        <div class="bs-card">
          <div class="bs-handle"></div>
          <div class="bs-header">
            <div class="bs-title">${label}</div>
            <button class="bs-close-btn">✕</button>
          </div>
          <div class="tp-display">
            <div class="tp-display-num ${editing==='h'?'active':''}" id="tp-h">${dispH()}</div>
            <div class="tp-display-sep">:</div>
            <div class="tp-display-num ${editing==='m'?'active':''}" id="tp-m">${dispM()}</div>
          </div>
          <div class="tp-numpad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'del'].map(n => {
              if (n==='') return `<button class="tp-num-btn tp-empty"></button>`;
              if (n==='del') return `<button class="tp-num-btn tp-del" data-del>⌫</button>`;
              return `<button class="tp-num-btn" data-n="${n}">${n}</button>`;
            }).join('')}
          </div>
          <div class="bs-footer">
            <button class="bs-btn-cancel">Cancelar</button>
            <button class="bs-btn-ok" ${!ok?'disabled style="opacity:.4;cursor:not-allowed"':''}>Listo</button>
          </div>
        </div>`;
      overlay.querySelector('#tp-h').onclick = () => { editing='h'; buffer=''; render(); };
      overlay.querySelector('#tp-m').onclick = () => { editing='m'; buffer=''; render(); };
      overlay.querySelectorAll('[data-n]').forEach(btn => {
        btn.onclick = () => {
          const digit = btn.dataset.n;
          if (editing==='h') {
            if (buffer==='') { if(parseInt(digit)<=2){buffer=digit;hh=digit;}else{hh=digit;buffer='';editing='m';} }
            else { const c=buffer+digit; if(parseInt(c)<=23){hh=c;buffer='';editing='m';}else{hh=digit;buffer='';if(parseInt(digit)>2)editing='m';} }
          } else {
            if (buffer==='') { if(parseInt(digit)<=5){buffer=digit;mm=digit;}else{mm=digit;buffer='';} }
            else { const c=buffer+digit; if(parseInt(c)<=59){mm=c;buffer='';}else{mm=digit;buffer='';} }
          }
          render();
        };
      });
      overlay.querySelector('[data-del]').onclick = () => { buffer=''; if(editing==='h')hh='';else mm=''; render(); };
      overlay.querySelector('.bs-close-btn').onclick = () => { overlay.remove(); resolve(null); };
      overlay.querySelector('.bs-btn-cancel').onclick = () => { overlay.remove(); resolve(null); };
      overlay.querySelector('.bs-btn-ok').onclick = () => {
        if (!ok) return;
        validate();
        if (hh===''||mm==='') { render(); return; }
        overlay.remove();
        resolve(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
      };
      overlay.addEventListener('click', e => { if (e.target===overlay){overlay.remove();resolve(null);} });
    }
    render();
  });
};

/* ─────────────────────────────────────────
   CONDUCTOR PICKER
   uiConductorPicker({ conductores, value, label })
   Returns Promise<string|null>
───────────────────────────────────────── */
window.uiConductorPicker = function({ conductores = [], value = '', label = 'Elegir conductor' } = {}) {
  return new Promise(resolve => {
    let sel = value;
    let query = '';
    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    document.body.appendChild(overlay);

    function filtered() {
      if (!query) return conductores;
      const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return conductores.filter(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q));
    }

    function render() {
      const lista = filtered();
      overlay.innerHTML = `
        <div class="bs-card">
          <div class="bs-handle"></div>
          <div class="bs-header">
            <div class="bs-title">${label}</div>
            <button class="bs-close-btn">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="cp-search-wrap">
            <span class="cp-search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
            <input class="cp-search-input" type="text" placeholder="Buscar..." value="${query}" autocomplete="off">
          </div>
          <div class="cp-list">
            <button class="cp-sin-asignar" data-clear>
              <span class="cp-sin-asignar-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#555" stroke-width="1.8"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#555" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="cp-sin-asignar-txt">Sin asignar</span>
            </button>
            <div class="cp-divider"></div>
            ${lista.length === 0
              ? `<div class="cp-empty">Sin resultados</div>`
              : lista.map(c => {
                  const initials = c.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
                  return `<button class="cp-item ${c===sel?'selected':''}" data-name="${c.replace(/"/g,'&quot;')}">
                    <span class="cp-item-avatar">${initials}</span>
                    <span class="cp-item-name">${c}</span>
                    <span class="cp-item-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="#185FA5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </span>
                  </button>`;
                }).join('')
            }
          </div>
        </div>`;

      // Búsqueda
      const searchInput = overlay.querySelector('.cp-search-input');
      searchInput.addEventListener('input', e => { query = e.target.value; render(); });
      // Foco automático (pequeño delay para que el DOM esté listo)
      setTimeout(() => searchInput.focus(), 80);

      // Sin asignar
      overlay.querySelector('[data-clear]').onclick = () => { overlay.remove(); resolve(''); };

      // Items
      overlay.querySelectorAll('.cp-item').forEach(btn => {
        btn.onclick = () => {
          sel = btn.dataset.name;
          overlay.remove();
          resolve(sel);
        };
      });

      overlay.querySelector('.bs-close-btn').onclick = () => { overlay.remove(); resolve(null); };
      overlay.addEventListener('click', e => { if (e.target===overlay){overlay.remove();resolve(null);} });
    }
    render();
  });
};

/* ─────────────────────────────────────────
   HELPER: upgrade inputs date/time/select en DOM
───────────────────────────────────────── */
window.upgradeInputs = function(container) {
  container = container || document;

  // ── DATE inputs ──
  container.querySelectorAll('input[type="date"]').forEach(input => {
    if (input.dataset.upgraded) return;
    input.dataset.upgraded = 'true';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-fake-input' + (input.value ? '' : ' empty');
    function updateBtn() {
      const v = input.value;
      if (v) {
        const d = new Date(v + 'T00:00:00');
        const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()];
        const fmtd = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
        btn.innerHTML = `<span class="ui-fake-input-icon">📅</span><span style="color:#eee;">${days} ${fmtd}</span>`;
        btn.classList.remove('empty');
      } else {
        btn.innerHTML = `<span class="ui-fake-input-icon">📅</span><span>Elegir fecha</span>`;
        btn.classList.add('empty');
      }
    }
    updateBtn();
    btn.onclick = async () => {
      const result = await uiDatePicker({ value: input.value, min: input.min || null });
      if (result !== null) { input.value = result; input.dispatchEvent(new Event('change',{bubbles:true})); updateBtn(); }
    };
    input.addEventListener('change', updateBtn);
    input.style.display = 'none';
    input.insertAdjacentElement('afterend', btn);
  });

  // ── TIME inputs ──
  container.querySelectorAll('input[type="time"]').forEach(input => {
    if (input.dataset.upgraded) return;
    input.dataset.upgraded = 'true';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-fake-input' + (input.value ? '' : ' empty');
    function updateBtn() {
      const v = input.value;
      if (v) {
        btn.innerHTML = `<span class="ui-fake-input-icon">🕐</span><span style="color:#eee;">${v}</span>`;
        btn.classList.remove('empty');
      } else {
        btn.innerHTML = `<span class="ui-fake-input-icon">🕐</span><span>Elegir hora</span>`;
        btn.classList.add('empty');
      }
    }
    updateBtn();
    btn.onclick = async () => {
      const result = await uiTimePicker({ value: input.value });
      if (result !== null) { input.value = result; input.dispatchEvent(new Event('change',{bubbles:true})); updateBtn(); }
    };
    input.addEventListener('change', updateBtn);
    input.style.display = 'none';
    input.insertAdjacentElement('afterend', btn);
  });

  // ── SELECT de conductor (los que tienen id que empieza con sal-cond- o reg-cond-) ──
  container.querySelectorAll('select[id^="sal-cond-"], select[id^="reg-cond-"], select[id^="edit-cond"]').forEach(select => {
    if (select.dataset.upgraded) return;
    // Solo si es un <select> (no el input de texto del modal de historial)
    if (select.tagName !== 'SELECT') return;
    select.dataset.upgraded = 'true';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-fake-input' + (select.value ? '' : ' empty');

    function updateBtn() {
      const v = select.value;
      if (v) {
        btn.innerHTML = `<span class="ui-fake-input-icon">👤</span><span style="color:#eee;">${v}</span>`;
        btn.classList.remove('empty');
      } else {
        btn.innerHTML = `<span class="ui-fake-input-icon">👤</span><span>Elegir conductor</span>`;
        btn.classList.add('empty');
      }
    }
    updateBtn();

    btn.onclick = async () => {
      // Obtener opciones del select (excluye la primera vacía)
      const conductores = [...select.options]
        .filter(o => o.value)
        .map(o => o.value);
      const result = await uiConductorPicker({
        conductores,
        value: select.value,
        label: 'Elegir conductor'
      });
      if (result !== null) {
        select.value = result;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        updateBtn();
      }
    };

    select.style.display = 'none';
    select.insertAdjacentElement('afterend', btn);
  });
};

/* ─────────────────────────────────────────
   AUTO-UPGRADE al cargar
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => upgradeInputs(document));

const _uiObserver = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      upgradeInputs(node);
    });
  });
});
_uiObserver.observe(document.body, { childList: true, subtree: true });
