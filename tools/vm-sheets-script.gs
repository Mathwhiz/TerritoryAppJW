/**
 * Apps Script para exportar el programa de Vida y Ministerio desde Ziv a Google Sheets.
 *
 * SETUP:
 * 1. Abrí el Google Sheet de VM → Extensiones → Apps Script → pegá este código.
 * 2. Guardar → Implementar → Nueva implementación:
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona
 * 3. Copiá la URL generada y pegala en Admin → Congregación → "URL Apps Script — Vida y Ministerio".
 *    IMPORTANTE: Si ya tenés un deployment, ir a Implementar → Gestionar implementaciones →
 *    lápiz (editar) → Versión: "Nueva versión" → Implementar. La URL no cambia.
 *
 * PAYLOAD JSON (POST body como text/plain):
 * {
 *   action: "saveVMMes" | "saveVMSemana",
 *   hoja: "Abril 26",
 *   encargadoAux: "José Reynoso",
 *   semanas: [{ fecha: "2026-04-06", filas: [["col A", "col B", "col C"], ...] }]
 * }
 */

var BG_VERDE  = '#38761D';
var BG_GRIS   = '#999999';
var BG_ORO    = '#BF9000';
var BG_ROJO   = '#990000';
var FG_BLANCO = '#FFFFFF';
var FG_NEGRO  = '#000000';
var BG_BLANCO = '#FFFFFF';

var SECCIONES_BG = {
  'Tesoros de la Biblia':    BG_GRIS,
  'Seamos Mejores Maestros': BG_ORO,
  'Nuestra Vida Cristiana':  BG_ROJO,
};

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss      = SpreadsheetApp.getActiveSpreadsheet();
    var sheet   = _getOrCreateSheet(ss, payload.hoja);

    if (payload.action === 'saveVMMes') {
      _escribirMes(sheet, payload.encargadoAux || '', payload.semanas || []);
    } else if (payload.action === 'saveVMSemana') {
      _setEncargadoAux(sheet, payload.encargadoAux || '');
      _reemplazarSemana(sheet, (payload.semanas || [])[0]?.filas || []);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('VM Sheets Script v2.3 — OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

function _getOrCreateSheet(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) sheet = ss.insertSheet(nombre);
  return sheet;
}

function _setEncargadoAux(sheet, nombre) {
  while (sheet.getLastRow() < 2) sheet.appendRow(['']);
  try { sheet.getRange(2, 1, 1, 3).breakApart(); } catch(e) {}
  sheet.getRange(2, 1, 1, 3).merge();
  sheet.getRange(2, 1)
    .setValue(nombre ? 'Sala Auxiliar: ' + nombre : 'Sala Auxiliar: ')
    .setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center')
    .setBackground(BG_BLANCO).setFontColor(FG_NEGRO);
}

function _escribirMes(sheet, encargadoAux, semanas) {
  var lastRow = sheet.getLastRow();
  if (lastRow >= 1) {
    try { sheet.getRange(1, 1, Math.max(lastRow, 3), 3).breakApart(); } catch(e) {}
    sheet.clearContents();
    sheet.clearFormats();
  }

  sheet.setColumnWidth(1, 550);
  sheet.setColumnWidth(2, 230);
  sheet.setColumnWidth(3, 200);

  try { sheet.getRange(1, 1, 1, 3).breakApart(); } catch(e) {}
  sheet.getRange(1, 1, 1, 3).merge();
  sheet.getRange(1, 1)
    .setValue('Reunión Vida y Ministerio Cristianos')
    .setBackground(BG_VERDE).setFontColor(FG_BLANCO)
    .setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center');

  _setEncargadoAux(sheet, encargadoAux);

  var allFilas = [];
  semanas.forEach(function(s) { allFilas = allFilas.concat(s.filas); });
  if (allFilas.length > 0) _writeFilasConFormato(sheet, 3, allFilas);
}

function _reemplazarSemana(sheet, filas) {
  if (!filas || !filas.length) return;
  var headerText = String(filas[0][0]).trim();
  var lastRow    = sheet.getLastRow();

  if (lastRow < 3) { _writeFilasConFormato(sheet, 3, filas); return; }

  var colA      = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
  var diaMatch  = headerText.match(/Semana del (\d{1,2})/i);
  var diaInicio = diaMatch ? diaMatch[1].replace(/^0/, '') : null;

  var startIdx = -1, endIdx = colA.length - 1;
  for (var i = 0; i < colA.length; i++) {
    var val      = String(colA[i][0]).trim();
    var esSemana = val.toLowerCase().indexOf('semana del') === 0;
    var esEsta   = val === headerText ||
      (esSemana && diaInicio !== null &&
       val.match(/Semana del (\d{1,2})/i)?.[1]?.replace(/^0/, '') === diaInicio);
    if (esEsta)                         { startIdx = i; }
    else if (startIdx >= 0 && esSemana) { endIdx = i - 1; break; }
  }

  var startRow = startIdx >= 0 ? startIdx + 3 : lastRow + 1;
  if (startIdx >= 0) {
    var existingCount = endIdx - startIdx + 1;
    try { sheet.getRange(startRow, 1, existingCount, 3).breakApart(); } catch(e) {}
    if (existingCount > filas.length)
      sheet.deleteRows(startRow + filas.length, existingCount - filas.length);
    else if (existingCount < filas.length)
      sheet.insertRowsBefore(startRow + existingCount, filas.length - existingCount);
  }
  _writeFilasConFormato(sheet, startRow, filas);
}

// ─── Formateo en batch — mínimo de llamadas a la API ─────────────────────────
function _writeFilasConFormato(sheet, startRow, filas) {
  var n = filas.length;
  if (!n) return;

  // Paso 1: escribir valores + deshacer merges (2 llamadas)
  sheet.getRange(startRow, 1, n, 3).setValues(filas);
  try { sheet.getRange(startRow, 1, n, 3).breakApart(); } catch(e) {}

  // Paso 2: clasificar filas y acumular A1-notation por categoría
  var lists = {
    semana:     [], tesoros:    [], seamos:     [], vc:       [],
    salaBg:     [],  // B + C del sub-header sala
    normalBold: [], normal:     [], nombres:    [],
    mergeAC:    [], mergeBC:    [],
  };

  for (var i = 0; i < n; i++) {
    var r    = startRow + i;
    var colA = String(filas[i][0] || '').trim();
    var colB = String(filas[i][1] || '').trim();
    var colC = String(filas[i][2] || '').trim();

    if (colA.toLowerCase().indexOf('semana del') === 0) {
      lists.semana.push('A'+r+':C'+r);
      lists.mergeAC.push('A'+r+':C'+r);

    } else if (SECCIONES_BG[colA] === BG_GRIS) {
      lists.tesoros.push('A'+r+':C'+r);
      lists.mergeAC.push('A'+r+':C'+r);

    } else if (SECCIONES_BG[colA] === BG_ORO) {
      lists.seamos.push('A'+r+':C'+r);
      lists.mergeAC.push('A'+r+':C'+r);

    } else if (SECCIONES_BG[colA] === BG_ROJO) {
      lists.vc.push('A'+r+':C'+r);
      lists.mergeAC.push('A'+r+':C'+r);

    } else if (colA === '' && colB === 'Sala Principal') {
      lists.salaBg.push('B'+r);
      lists.salaBg.push('C'+r);
      lists.normal.push('A'+r);

    } else {
      // fila normal: parte A + nombre(s) en B/C
      if (_esNegritaA(colA)) lists.normalBold.push('A'+r);
      else                   lists.normal.push('A'+r);

      if (colC !== '') {
        // dos nombres: sin merge
        lists.nombres.push('B'+r);
        lists.nombres.push('C'+r);
      } else if (colB !== '') {
        // un nombre: merge B:C
        lists.mergeBC.push('B'+r+':C'+r);
        lists.nombres.push('B'+r);
      }
    }
  }

  // Paso 3: aplicar merges en batch (2 llamadas en vez de N)
  if (lists.mergeAC.length) try { sheet.getRangeList(lists.mergeAC).merge(); } catch(e) {}
  if (lists.mergeBC.length) try { sheet.getRangeList(lists.mergeBC).merge(); } catch(e) {}

  // Paso 4: fondos (7 llamadas)
  _rl(sheet, lists.semana,     'setBackground',    BG_VERDE);
  _rl(sheet, lists.tesoros,    'setBackground',    BG_GRIS);
  _rl(sheet, lists.seamos,     'setBackground',    BG_ORO);
  _rl(sheet, lists.vc,         'setBackground',    BG_ROJO);
  _rl(sheet, lists.salaBg,     'setBackground',    BG_ORO);
  _rl(sheet, lists.normal.concat(lists.normalBold, lists.nombres), 'setBackground', BG_BLANCO);

  // Paso 5: colores de fuente (3 llamadas)
  var hdrs = lists.semana.concat(lists.tesoros, lists.seamos, lists.vc);
  _rl(sheet, hdrs,             'setFontColor',     FG_BLANCO);
  _rl(sheet, lists.salaBg,     'setFontColor',     FG_BLANCO);
  _rl(sheet, lists.normal.concat(lists.normalBold, lists.nombres), 'setFontColor', FG_NEGRO);

  // Paso 6: negrita (3 llamadas)
  _rl(sheet, hdrs,             'setFontWeight',    'bold');
  _rl(sheet, lists.salaBg,     'setFontWeight',    'bold');
  _rl(sheet, lists.normalBold, 'setFontWeight',    'bold');
  _rl(sheet, lists.normal.concat(lists.nombres), 'setFontWeight', 'normal');

  // Paso 7: tamaño (3 llamadas)
  _rl(sheet, lists.semana,     'setFontSize',      12);
  _rl(sheet, lists.tesoros.concat(lists.seamos, lists.vc, lists.salaBg), 'setFontSize', 11);
  _rl(sheet, lists.normal.concat(lists.normalBold, lists.nombres), 'setFontSize', 10);

  // Paso 8: alineación (3 llamadas)
  _rl(sheet, hdrs.concat(lists.salaBg), 'setHorizontalAlignment', 'center');
  _rl(sheet, lists.nombres,             'setHorizontalAlignment', 'center');
  _rl(sheet, lists.normal.concat(lists.normalBold), 'setHorizontalAlignment', 'left');
}

function _rl(sheet, a1List, method, value) {
  if (!a1List || !a1List.length) return;
  try { sheet.getRangeList(a1List)[method](value); } catch(e) {}
}

function _esNegritaA(colA) {
  var l = colA.toLowerCase();
  return l.indexOf('oraci') === 0 || l.indexOf('1.') === 0;
}
