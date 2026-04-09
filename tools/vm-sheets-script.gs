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
 *
 * PAYLOAD JSON (POST body como text/plain):
 * {
 *   action: "saveVMMes" | "saveVMSemana",
 *   hoja: "Abril 26",
 *   encargadoAux: "José Reynoso",
 *   semanas: [{ fecha: "2026-04-06", filas: [["col A", "col B", "col C"], ...] }]
 * }
 */

// ─── Colores (hex sin #, incluye prefijo FF para opaco) ─────────────────────
var BG_VERDE    = '#38761D';  // título + header semana
var BG_GRIS     = '#999999';  // Tesoros de la Biblia
var BG_ORO      = '#BF9000';  // Seamos Mejores Maestros + sala principal/aux sub-header
var BG_ROJO     = '#990000';  // Nuestra Vida Cristiana
var FG_BLANCO   = '#FFFFFF';
var BG_BLANCO   = '#FFFFFF';
var FG_NEGRO    = '#000000';

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
  return ContentService.createTextOutput('VM Sheets Script v2.1 — OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─── Obtener o crear hoja ────────────────────────────────────────────────────
function _getOrCreateSheet(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) sheet = ss.insertSheet(nombre);
  return sheet;
}

// ─── Actualizar encargado sala auxiliar (fila 2) ─────────────────────────────
function _setEncargadoAux(sheet, nombre) {
  while (sheet.getLastRow() < 2) sheet.appendRow(['']);
  _bf(sheet, 2, 1);
  sheet.getRange(2, 1, 1, 3).merge();
  var r = sheet.getRange(2, 1);
  r.setValue(nombre ? 'Sala Auxiliar: ' + nombre : 'Sala Auxiliar: ');
  r.setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center')
   .setBackground(BG_BLANCO).setFontColor(FG_NEGRO);
}

// ─── Exportar mes completo ────────────────────────────────────────────────────
function _escribirMes(sheet, encargadoAux, semanas) {
  var lastRow = sheet.getLastRow();
  if (lastRow >= 1) {
    try { sheet.getRange(1, 1, Math.max(lastRow, 3), 3).breakApart(); } catch(e) {}
    sheet.clearContents();
    sheet.clearFormats();
  }

  // Columnas
  sheet.setColumnWidth(1, 550);  // A — títulos de partes
  sheet.setColumnWidth(2, 230);  // B — sala principal
  sheet.setColumnWidth(3, 200);  // C — sala auxiliar

  // Fila 1 — título
  _bf(sheet, 1, 1);
  sheet.getRange(1, 1, 1, 3).merge();
  var r1 = sheet.getRange(1, 1);
  r1.setValue('Reunión Vida y Ministerio Cristianos');
  _estiloHeader(r1, BG_VERDE, 14);
  sheet.setRowHeight(1, 24);

  // Fila 2 — sala auxiliar
  _setEncargadoAux(sheet, encargadoAux);
  sheet.setRowHeight(2, 20);

  // Semanas desde fila 3
  var allFilas = [];
  semanas.forEach(function(s) { allFilas = allFilas.concat(s.filas); });
  if (allFilas.length > 0) _writeFilasConFormato(sheet, 3, allFilas);
}

// ─── Reemplazar semana individual ────────────────────────────────────────────
function _reemplazarSemana(sheet, filas) {
  if (!filas || !filas.length) return;

  var headerText = String(filas[0][0]).trim();
  var lastRow    = sheet.getLastRow();

  if (lastRow < 3) {
    _writeFilasConFormato(sheet, 3, filas);
    return;
  }

  var colA = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
  var diaMatch  = headerText.match(/Semana del (\d{1,2})/i);
  var diaInicio = diaMatch ? diaMatch[1].replace(/^0/, '') : null;

  var startIdx = -1, endIdx = colA.length - 1;
  for (var i = 0; i < colA.length; i++) {
    var val      = String(colA[i][0]).trim();
    var esSemana = val.toLowerCase().indexOf('semana del') === 0;
    var esEsta   = val === headerText ||
      (esSemana && diaInicio !== null &&
       val.match(/Semana del (\d{1,2})/i)?.[1]?.replace(/^0/, '') === diaInicio);
    if (esEsta) {
      startIdx = i;
    } else if (startIdx >= 0 && esSemana) {
      endIdx = i - 1;
      break;
    }
  }

  var startRow = startIdx >= 0 ? startIdx + 3 : lastRow + 1;

  if (startIdx >= 0) {
    var existingCount = endIdx - startIdx + 1;
    try { sheet.getRange(startRow, 1, existingCount, 3).breakApart(); } catch(e) {}
    if (existingCount > filas.length) {
      sheet.deleteRows(startRow + filas.length, existingCount - filas.length);
    } else if (existingCount < filas.length) {
      sheet.insertRowsBefore(startRow + existingCount, filas.length - existingCount);
    }
  }

  _writeFilasConFormato(sheet, startRow, filas);
}

// ─── Escribir filas con formato ───────────────────────────────────────────────
function _writeFilasConFormato(sheet, startRow, filas) {
  // Escribir valores de un golpe
  sheet.getRange(startRow, 1, filas.length, 3).setValues(filas);

  for (var i = 0; i < filas.length; i++) {
    var row  = startRow + i;
    var colA = String(filas[i][0] || '').trim();
    var colB = String(filas[i][1] || '').trim();
    var colC = String(filas[i][2] || '').trim();

    // Limpiar merges previos en esta fila
    _bf(sheet, row, 1);

    var rA  = sheet.getRange(row, 1);
    var rBC = sheet.getRange(row, 2, 1, 2);
    var r3  = sheet.getRange(row, 1, 1, 3);

    if (colA.toLowerCase().indexOf('semana del') === 0) {
      // ── Header de semana ──────────────────────────────────────────────
      r3.merge();
      _estiloHeader(rA, BG_VERDE, 12);
      sheet.setRowHeight(row, 20);

    } else if (colA === 'Tesoros de la Biblia') {
      // ── Header Tesoros ────────────────────────────────────────────────
      r3.merge();
      _estiloHeader(rA, BG_GRIS, 11);
      sheet.setRowHeight(row, 18);

    } else if (colA === 'Seamos Mejores Maestros') {
      // ── Header Seamos ─────────────────────────────────────────────────
      r3.merge();
      _estiloHeader(rA, BG_ORO, 11);
      sheet.setRowHeight(row, 18);

    } else if (colA === 'Nuestra Vida Cristiana') {
      // ── Header VC ────────────────────────────────────────────────────
      r3.merge();
      _estiloHeader(rA, BG_ROJO, 11);
      sheet.setRowHeight(row, 18);

    } else if (colA === '' && colB === 'Sala Principal') {
      // ── Sub-header sala principal / auxiliar ──────────────────────────
      // B y C separados (no merge) con fondo dorado
      var rB = sheet.getRange(row, 2);
      var rC = sheet.getRange(row, 3);
      rB.setBackground(BG_ORO).setFontColor(FG_BLANCO).setFontWeight('bold')
        .setFontSize(10).setHorizontalAlignment('center');
      rC.setBackground(BG_ORO).setFontColor(FG_BLANCO).setFontWeight('bold')
        .setFontSize(10).setHorizontalAlignment('center');
      rA.setBackground(BG_BLANCO);
      sheet.setRowHeight(row, 18);

    } else {
      // ── Fila normal ───────────────────────────────────────────────────
      // Decidir si A va en bold
      var boldA = _debeNegritaA(colA);
      rA.setFontWeight(boldA ? 'bold' : 'normal')
        .setFontSize(10)
        .setFontColor(FG_NEGRO)
        .setBackground(BG_BLANCO)
        .setHorizontalAlignment('left');

      if (colC !== '') {
        // Hay datos en B y C → no merge, centrar ambos
        sheet.getRange(row, 2).setHorizontalAlignment('center').setFontSize(10).setFontColor(FG_NEGRO).setBackground(BG_BLANCO);
        sheet.getRange(row, 3).setHorizontalAlignment('center').setFontSize(10).setFontColor(FG_NEGRO).setBackground(BG_BLANCO);
      } else if (colB !== '') {
        // Solo B tiene dato → merge B:C
        rBC.merge();
        sheet.getRange(row, 2).setHorizontalAlignment('center').setFontSize(10).setFontColor(FG_NEGRO).setBackground(BG_BLANCO);
      } else {
        // B y C vacíos
        rBC.setBackground(BG_BLANCO).setFontColor(FG_NEGRO);
      }
      sheet.setRowHeight(row, 18);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Aplicar estilo de header (fondo color, texto blanco, negrita, centrado)
function _estiloHeader(range, bg, fontSize) {
  range.setBackground(bg)
       .setFontColor(FG_BLANCO)
       .setFontWeight('bold')
       .setFontSize(fontSize || 11)
       .setHorizontalAlignment('center');
}

// Deshacer merges en fila, col A-C
function _bf(sheet, row, col) {
  try { sheet.getRange(row, col, 1, 3).breakApart(); } catch(e) {}
}

// ¿La columna A de esta fila normal va en negrita?
function _debeNegritaA(colA) {
  var lower = colA.toLowerCase();
  if (lower.indexOf('oraci') === 0) return true;      // Oración apertura / cierre / Final
  if (lower.indexOf('1.') === 0)    return true;      // Primer parte de sección (discurso Tesoros)
  return false;
}
