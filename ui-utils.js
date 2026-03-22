/* ═══════════════════════════════════════════════════════
   ui-utils.js  —  Modales custom + Date/Time picker
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
.ui-modal-icon.warn  { background: rgba(239,159,39,0.15); }
.ui-modal-icon.danger { background: rgba(240,149,149,0.15); }
.ui-modal-icon.info  { background: rgba(29,158,117,0.15); }

.ui-modal-title {
  font-size: 17px; font-weight: 600; color: #eee;
  text-align: center; margin-bottom: 8px;
}
.ui-modal-msg {
  font-size: 14px; color: #aaa; text-align: center;
  line-height: 1.5; margin-bottom: 20px;
}
.ui-modal-btns {
  display: flex; gap: 8px;
}
.ui-modal-btns button {
  flex: 1; padding: 11px;
  font-size: 14px; font-weight: 500;
  border-radius: 12px; border: none; cursor: pointer;
  transition: filter 0.1s, transform 0.1s;
}
.ui-modal-btns button:active { transform: scale(0.97); }
.ui-btn-cancel {
  background: #333; color: #aaa;
  border: 0.5px solid #444 !important;
}
.ui-btn-cancel:hover { filter: brightness(1.15); }
.ui-btn-confirm-warn  { background: #EF9F27; color: #fff; }
.ui-btn-confirm-danger { background: #A32D2D; color: #F09595; }
.ui-btn-confirm-info  { background: #1D9E75; color: #fff; }
.ui-btn-confirm-warn:hover,
.ui-btn-confirm-danger:hover,
.ui-btn-confirm-info:hover { filter: brightness(1.1); }

/* ── Alert (1 botón) ── */
.ui-btn-ok { background: #333; color: #eee; border: 0.5px solid #555 !important; }
.ui-btn-ok:hover { filter: brightness(1.15); }

/* ═══════════════════════════════════════════
   DATE PICKER
═══════════════════════════════════════════ */
.dp-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 9100; padding: 0;
  animation: uiFadeIn 0.15s ease;
}
@media (min-height: 600px) {
  .dp-overlay { align-items: center; padding: 1rem; }
}

.dp-card {
  background: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 24px 24px 0 0;
  width: 100%; max-width: 360px;
  padding: 1.25rem 1rem 1.5rem;
  box-shadow: 0 -16px 48px rgba(0,0,0,0.5);
  animation: dpSlideUp 0.22s cubic-bezier(.22,.68,0,1.2);
  user-select: none;
}
@media (min-height: 600px) {
  .dp-card { border-radius: 24px; box-shadow: 0 24px 64px rgba(0,0,0,0.6); }
}
@keyframes dpSlideUp { from { transform:translateY(40px); opacity:0 } to { transform:translateY(0); opacity:1 } }

.dp-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; padding: 0 4px;
}
.dp-title { font-size: 15px; font-weight: 600; color: #eee; }
.dp-nav-btn {
  width: 34px; height: 34px; border-radius: 10px;
  border: 0.5px solid #444; background: #1e1e1e; color: #aaa;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 16px; transition: background 0.1s, color 0.1s;
}
.dp-nav-btn:hover { background: #2e2e2e; color: #eee; }

.dp-weekdays {
  display: grid; grid-template-columns: repeat(7,1fr);
  text-align: center; margin-bottom: 6px;
}
.dp-wd { font-size: 11px; font-weight: 600; color: #555; padding: 4px 0; }

.dp-days {
  display: grid; grid-template-columns: repeat(7,1fr);
  gap: 2px;
}
.dp-day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 500; color: #ccc;
  border-radius: 10px; cursor: pointer;
  transition: background 0.1s, color 0.1s;
  border: none; background: transparent;
}
.dp-day:hover:not(.dp-day-other):not(.dp-day-disabled) { background: #333; color: #eee; }
.dp-day-other { color: #444; cursor: default; }
.dp-day-disabled { color: #333; cursor: not-allowed; }
.dp-day-today { color: #97C459; font-weight: 700; }
.dp-day-selected {
  background: #185FA5 !important; color: #fff !important;
  font-weight: 700;
}

.dp-footer {
  display: flex; gap: 8px; margin-top: 14px; padding: 0 4px;
}
.dp-footer button {
  flex: 1; padding: 11px; font-size: 14px; font-weight: 500;
  border-radius: 12px; border: none; cursor: pointer;
  transition: filter 0.1s;
}
.dp-btn-cancel { background: #333; color: #aaa; border: 0.5px solid #444 !important; }
.dp-btn-cancel:hover { filter: brightness(1.15); }
.dp-btn-ok { background: #185FA5; color: #fff; }
.dp-btn-ok:hover { filter: brightness(1.1); }

/* ═══════════════════════════════════════════
   TIME PICKER
═══════════════════════════════════════════ */
.tp-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 9100; padding: 0;
  animation: uiFadeIn 0.15s ease;
}
@media (min-height: 600px) {
  .tp-overlay { align-items: center; padding: 1rem; }
}

.tp-card {
  background: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 24px 24px 0 0;
  width: 100%; max-width: 320px;
  padding: 1.25rem 1rem 1.5rem;
  box-shadow: 0 -16px 48px rgba(0,0,0,0.5);
  animation: dpSlideUp 0.22s cubic-bezier(.22,.68,0,1.2);
  user-select: none;
}
@media (min-height: 600px) {
  .tp-card { border-radius: 24px; box-shadow: 0 24px 64px rgba(0,0,0,0.6); }
}

.tp-title { font-size: 15px; font-weight: 600; color: #eee; text-align: center; margin-bottom: 20px; }

.tp-display {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; margin-bottom: 24px;
}
.tp-display-num {
  font-size: 56px; font-weight: 300; color: #eee;
  min-width: 70px; text-align: center; line-height: 1;
  background: #1e1e1e; border-radius: 14px; padding: 8px 12px;
  cursor: pointer; transition: background 0.1s;
}
.tp-display-num.active { background: #185FA5; color: #fff; }
.tp-display-num:hover:not(.active) { background: #2a2a2a; }
.tp-display-sep { font-size: 48px; font-weight: 300; color: #555; line-height: 1; margin: 0 2px; }

.tp-numpad {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 8px;
  margin-bottom: 14px;
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

.tp-footer {
  display: flex; gap: 8px; padding: 0 4px;
}
.tp-footer button {
  flex: 1; padding: 11px; font-size: 14px; font-weight: 500;
  border-radius: 12px; border: none; cursor: pointer;
  transition: filter 0.1s;
}
.tp-btn-cancel { background: #333; color: #aaa; border: 0.5px solid #444 !important; }
.tp-btn-cancel:hover { filter: brightness(1.15); }
.tp-btn-ok { background: #185FA5; color: #fff; }
.tp-btn-ok:hover { filter: brightness(1.1); }

/* ── Fake input (reemplaza date/time nativos) ── */
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
`;
  document.head.appendChild(style);
})();

/* ─────────────────────────────────────────
   MODAL CONFIRM
───────────────────────────────────────── */
/**
 * uiConfirm({ title, msg, confirmText, cancelText, type })
 * type: 'warn' | 'danger' | 'info'
 * Returns Promise<boolean>
 */
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
/**
 * uiDatePicker({ value, min, label })
 * value: 'YYYY-MM-DD' o ''
 * Returns Promise<string|null>  ('YYYY-MM-DD' o null si cancela)
 */
window.uiDatePicker = function({ value = '', min = null, label = 'Elegir fecha' } = {}) {
  return new Promise(resolve => {
    const today = new Date();
    today.setHours(0,0,0,0);

    let viewYear, viewMonth, selDate;

    if (value) {
      const d = new Date(value + 'T00:00:00');
      viewYear  = d.getFullYear();
      viewMonth = d.getMonth();
      selDate   = new Date(d);
    } else {
      viewYear  = today.getFullYear();
      viewMonth = today.getMonth();
      selDate   = null;
    }

    const overlay = document.createElement('div');
    overlay.className = 'dp-overlay';
    document.body.appendChild(overlay);

    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const DIAS_SEMANA = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

    function pad(n) { return String(n).padStart(2,'0'); }
    function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

    function minDate() {
      if (!min) return null;
      const d = new Date(min + 'T00:00:00'); return d;
    }

    function render() {
      const firstDay = new Date(viewYear, viewMonth, 1);
      const lastDay  = new Date(viewYear, viewMonth + 1, 0);
      // Lunes = 0
      let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6;
      const cells = [];
      // días del mes anterior
      for (let i = startDow - 1; i >= 0; i--) {
        const d = new Date(viewYear, viewMonth, -i);
        cells.push({ d, other: true });
      }
      // días del mes
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(viewYear, viewMonth, i);
        cells.push({ d, other: false });
      }
      // completar grilla
      while (cells.length % 7 !== 0) {
        const d = new Date(viewYear, viewMonth + 1, cells.length - lastDay.getDate() - startDow + 1);
        cells.push({ d, other: true });
      }

      const mn = minDate();
      const daysHTML = cells.map(({ d, other }) => {
        const isToday   = !other && d.toDateString() === today.toDateString();
        const isSel     = selDate && !other && d.toDateString() === selDate.toDateString();
        const isDisabled = mn && d < mn;
        let cls = 'dp-day';
        if (other)      cls += ' dp-day-other';
        else if (isDisabled) cls += ' dp-day-disabled';
        else if (isToday)    cls += ' dp-day-today';
        if (isSel)      cls += ' dp-day-selected';
        const iso = toISO(d);
        return `<button class="${cls}" data-date="${iso}" ${isDisabled||other ? 'disabled' : ''}>${d.getDate()}</button>`;
      }).join('');

      overlay.innerHTML = `
        <div class="dp-card">
          <div class="dp-header">
            <button class="dp-nav-btn" id="dp-prev">‹</button>
            <div class="dp-title">${MESES[viewMonth]} ${viewYear}</div>
            <button class="dp-nav-btn" id="dp-next">›</button>
          </div>
          <div class="dp-weekdays">${DIAS_SEMANA.map(d=>`<div class="dp-wd">${d}</div>`).join('')}</div>
          <div class="dp-days">${daysHTML}</div>
          <div class="dp-footer">
            <button class="dp-btn-cancel">Cancelar</button>
            <button class="dp-btn-ok" ${!selDate?'disabled style="opacity:.4;cursor:not-allowed"':''}>Listo</button>
          </div>
        </div>`;

      overlay.querySelector('#dp-prev').onclick = () => {
        viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render();
      };
      overlay.querySelector('#dp-next').onclick = () => {
        viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render();
      };
      overlay.querySelectorAll('.dp-day:not([disabled])').forEach(btn => {
        btn.onclick = () => {
          selDate = new Date(btn.dataset.date + 'T00:00:00');
          render();
        };
      });
      overlay.querySelector('.dp-btn-cancel').onclick = () => { overlay.remove(); resolve(null); };
      overlay.querySelector('.dp-btn-ok').onclick = () => {
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
/**
 * uiTimePicker({ value, label })
 * value: 'HH:MM' o ''
 * Returns Promise<string|null>  ('HH:MM' o null si cancela)
 */
window.uiTimePicker = function({ value = '', label = 'Elegir hora' } = {}) {
  return new Promise(resolve => {
    let hh = '', mm = '';
    let editing = 'h'; // 'h' o 'm'
    let buffer  = '';

    if (value && value.includes(':')) {
      [hh, mm] = value.split(':');
    }

    const overlay = document.createElement('div');
    overlay.className = 'tp-overlay';
    document.body.appendChild(overlay);

    function dispH() { return hh !== '' ? String(hh).padStart(2,'0') : '--'; }
    function dispM() { return mm !== '' ? String(mm).padStart(2,'0') : '--'; }

    function validate() {
      let h = parseInt(hh), m = parseInt(mm);
      if (isNaN(h) || h < 0 || h > 23) hh = '';
      if (isNaN(m) || m < 0 || m > 59) mm = '';
    }

    function render() {
      const okEnabled = hh !== '' && mm !== '';
      overlay.innerHTML = `
        <div class="tp-card">
          <div class="tp-title">${label}</div>
          <div class="tp-display">
            <div class="tp-display-num ${editing==='h'?'active':''}" id="tp-h">${dispH()}</div>
            <div class="tp-display-sep">:</div>
            <div class="tp-display-num ${editing==='m'?'active':''}" id="tp-m">${dispM()}</div>
          </div>
          <div class="tp-numpad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'del'].map(n => {
              if (n === '') return `<button class="tp-num-btn tp-empty"></button>`;
              if (n === 'del') return `<button class="tp-num-btn tp-del" data-del>⌫</button>`;
              return `<button class="tp-num-btn" data-n="${n}">${n}</button>`;
            }).join('')}
          </div>
          <div class="tp-footer">
            <button class="tp-btn-cancel">Cancelar</button>
            <button class="tp-btn-ok" ${!okEnabled?'disabled style="opacity:.4;cursor:not-allowed"':''}>Listo</button>
          </div>
        </div>`;

      overlay.querySelector('#tp-h').onclick = () => { editing = 'h'; buffer = ''; render(); };
      overlay.querySelector('#tp-m').onclick = () => { editing = 'm'; buffer = ''; render(); };

      overlay.querySelectorAll('[data-n]').forEach(btn => {
        btn.onclick = () => {
          const digit = btn.dataset.n;
          if (editing === 'h') {
            if (buffer === '') {
              if (parseInt(digit) <= 2) { buffer = digit; hh = digit; }
              else { hh = digit; buffer = ''; editing = 'm'; }
            } else {
              const combined = buffer + digit;
              if (parseInt(combined) <= 23) { hh = combined; buffer = ''; editing = 'm'; }
              else { hh = digit; buffer = ''; if (parseInt(digit) > 2) { editing = 'm'; } }
            }
          } else {
            if (buffer === '') {
              if (parseInt(digit) <= 5) { buffer = digit; mm = digit; }
              else { mm = digit; buffer = ''; }
            } else {
              const combined = buffer + digit;
              if (parseInt(combined) <= 59) { mm = combined; buffer = ''; }
              else { mm = digit; buffer = ''; }
            }
          }
          render();
        };
      });

      overlay.querySelector('[data-del]').onclick = () => {
        buffer = '';
        if (editing === 'h') hh = '';
        else mm = '';
        render();
      };

      overlay.querySelector('.tp-btn-cancel').onclick = () => { overlay.remove(); resolve(null); };
      overlay.querySelector('.tp-btn-ok').onclick = () => {
        if (!okEnabled) return;
        validate();
        if (hh === '' || mm === '') { render(); return; }
        overlay.remove();
        resolve(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
      };
      overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
    }

    render();
  });
};

/* ─────────────────────────────────────────
   HELPER: reemplazar inputs date/time en el DOM
   Llamar después de renderizar los cards de salida
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
      const minVal = input.min || null;
      const result = await uiDatePicker({ value: input.value, min: minVal });
      if (result !== null) {
        input.value = result;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        updateBtn();
      }
    };

    // Escuchar cambios externos (ej: desde JS)
    const origSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
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
      if (result !== null) {
        input.value = result;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        updateBtn();
      }
    };

    input.addEventListener('change', updateBtn);
    input.style.display = 'none';
    input.insertAdjacentElement('afterend', btn);
  });
};

/* ─────────────────────────────────────────
   AUTO-UPGRADE al cargar
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => upgradeInputs(document));

// MutationObserver: upgrade inputs nuevos que se agreguen dinámicamente
const _uiObserver = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      upgradeInputs(node);
    });
  });
});
_uiObserver.observe(document.body, { childList: true, subtree: true });
