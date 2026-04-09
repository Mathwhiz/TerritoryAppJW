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
 * ACCIONES SOPORTADAS (campo `action` en el payload):
 *   saveVMMes    → borra las semanas del mes y reescribe todo (col A-C desde fila 3)
 *   saveVMSemana → busca el header de la semana y reemplaza solo esas filas
 *
 * PAYLOAD JSON (POST body como text/plain):
 * {
 *   action: "saveVMMes" | "saveVMSemana",
 *   hoja: "Abril 26",
 *   encargadoAux: "José Reynoso",   // nombre del encargado de sala aux del mes (puede ser "")
 *   semanas: [
 *     { fecha: "2026-04-06", filas: [["col A", "col B", "col C"], ...] }
 *   ]
 * }
 */

// ─── Colores del tema ────────────────────────────────────────────────────────
var C_TITLE_BG    = '#1C3B5A';   // azul oscuro — fila 1 título hoja
var C_TITLE_FG    = '#FFFFFF';
var C_AUXROW_BG   = '#2E4A5F';   // azul más claro — fila 2 sala auxiliar
var C_AUXROW_FG   = '#FFFFFF';
var C_WEEK_BG     = '#E8F0FE';   // azul claro — header de semana
var C_WEEK_FG     = '#1A237E';
var C_SECTION_BG  = '#F5F5F5';   // gris claro — headers de sección
var C_SECTION_FG  = '#37474F';
var C_SALA_BG     = '#FAFAFA';   // gris muy claro — sub-header sala principal/auxiliar
var C_SALA_FG     = '#757575';
var C_ROW_BG      = '#FFFFFF';   // blanco — filas normales
var C_ROW_FG      = '#212121';
var C_ROW_ALT_BG  = '#F8F9FA';   // gris alternado (filas impares dentro de sección)
var C_BORDER      = '#CFD8DC';

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
  return ContentService.createTextOutput('VM Sheets Script v2.0 — OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─── Obtener o crear hoja del mes ───────────────────────────────────────────
function _getOrCreateSheet(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
  }
  return sheet;
}

// ─── Configurar columnas y filas 1-2 de la hoja ─────────────────────────────
function _initHoja(sheet, encargadoAux) {
  // Anchos de columna
  sheet.setColumnWidth(1, 360);  // A
  sheet.setColumnWidth(2, 180);  // B
  sheet.setColumnWidth(3, 180);  // C

  // Fila 1 — título
  _clearMerges(sheet, 1, 1);
  sheet.getRange(1, 1, 1, 3).merge();
  var r1 = sheet.getRange(1, 1);
  r1.setValue('Reunión Vida y Ministerio Cristiana');
  r1.setFontWeight('bold')
    .setFontSize(12)
    .setHorizontalAlignment('center')
    .setBackground(C_TITLE_BG)
    .setFontColor(C_TITLE_FG);
  sheet.setRowHeight(1, 28);

  // Fila 2 — sala auxiliar
  _clearMerges(sheet, 2, 1);
  sheet.getRange(2, 1, 1, 3).merge();
  var r2 = sheet.getRange(2, 1);
  r2.setValue(encargadoAux ? 'Sala Auxiliar: ' + encargadoAux : 'Sala Auxiliar: ');
  r2.setFontWeight('normal')
    .setFontStyle('italic')
    .setFontSize(10)
    .setHorizontalAlignment('left')
    .setBackground(C_AUXROW_BG)
    .setFontColor(C_AUXROW_FG);
  sheet.setRowHeight(2, 22);
}

// ─── Actualizar encargado de sala auxiliar (fila 2) ─────────────────────────
function _setEncargadoAux(sheet, nombre) {
  while (sheet.getLastRow() < 2) sheet.appendRow(['']);
  _clearMerges(sheet, 2, 1);
  sheet.getRange(2, 1, 1, 3).merge();
  var r2 = sheet.getRange(2, 1);
  r2.setValue(nombre ? 'Sala Auxiliar: ' + nombre : 'Sala Auxiliar: ');
  r2.setBackground(C_AUXROW_BG).setFontColor(C_AUXROW_FG).setFontStyle('italic').setFontSize(10);
}

// ─── Exportar mes completo (borra filas 3+ y reescribe) ─────────────────────
function _escribirMes(sheet, encargadoAux, semanas) {
  // Limpiar todo primero
  var lastRow = sheet.getLastRow();
  if (lastRow >= 1) {
    sheet.clearContents();
    sheet.clearFormats();
    // Limpiar merges de toda la hoja
    try { sheet.getRange(1, 1, Math.max(lastRow, 3), 3).breakApart(); } catch(e) {}
  }

  _initHoja(sheet, encargadoAux);

  var allFilas = [];
  semanas.forEach(function(s) { allFilas = allFilas.concat(s.filas); });

  if (allFilas.length > 0) {
    _writeFilasConFormato(sheet, 3, allFilas);
  }
}

// ─── Reemplazar una semana individual (busca header y sobreescribe) ──────────
function _reemplazarSemana(sheet, filas) {
  if (!filas || !filas.length) return;

  var headerText = String(filas[0][0]).trim();
  var lastRow    = sheet.getLastRow();

  if (lastRow < 3) {
    _writeFilasConFormato(sheet, 3, filas);
    return;
  }

  var colA = sheet.getRange(3, 1, lastRow - 2, 1).getValues();

  var diaMatch = headerText.match(/Semana del (\d{1,2})/i);
  var diaInicio = diaMatch ? diaMatch[1].replace(/^0/, '') : null;

  var startIdx = -1;
  var endIdx   = colA.length - 1;

  for (var i = 0; i < colA.length; i++) {
    var val = String(colA[i][0]).trim();
    var esSemana = val.toLowerCase().indexOf('semana del') === 0;
    var esEstaSemana = val === headerText ||
      (esSemana && diaInicio !== null && val.match(/Semana del (\d{1,2})/i)?.[1]?.replace(/^0/, '') === diaInicio);
    if (esEstaSemana) {
      startIdx = i;
    } else if (startIdx >= 0 && esSemana) {
      endIdx = i - 1;
      break;
    }
  }

  var startRow = startIdx >= 0 ? startIdx + 3 : lastRow + 1;

  if (startIdx >= 0) {
    var existingCount = endIdx - startIdx + 1;
    // Deshacer merges en la zona a reemplazar
    try {
      sheet.getRange(startRow, 1, existingCount, 3).breakApart();
    } catch(e) {}

    if (existingCount > filas.length) {
      sheet.deleteRows(startRow + filas.length, existingCount - filas.length);
    } else if (existingCount < filas.length) {
      sheet.insertRowsBefore(startRow + existingCount, filas.length - existingCount);
    }
  }

  _writeFilasConFormato(sheet, startRow, filas);
}

// ─── Escribir filas con formato ──────────────────────────────────────────────
function _writeFilasConFormato(sheet, startRow, filas) {
  var SECCIONES = ['Tesoros de la Biblia', 'Seamos Mejores Maestros', 'Nuestra Vida Cristiana'];

  // Primero escribir valores crudos de un golpe (más rápido)
  sheet.getRange(startRow, 1, filas.length, 3).setValues(filas);

  // Luego aplicar formato fila a fila
  var altCounter = 0; // para alternado dentro de sección
  for (var i = 0; i < filas.length; i++) {
    var row    = startRow + i;
    var colA   = String(filas[i][0] || '').trim();
    var colB   = String(filas[i][1] || '').trim();
    var range3 = sheet.getRange(row, 1, 1, 3);
    var rangeA = sheet.getRange(row, 1);

    // Deshacer cualquier merge previo
    try { range3.breakApart(); } catch(e) {}

    if (colA.toLowerCase().indexOf('semana del') === 0) {
      // ── Header de semana ──────────────────────────────────────────────
      range3.merge();
      rangeA.setValue(colA);
      range3.setBackground(C_WEEK_BG)
            .setFontColor(C_WEEK_FG)
            .setFontWeight('bold')
            .setFontSize(11)
            .setHorizontalAlignment('left');
      sheet.setRowHeight(row, 24);
      altCounter = 0;

    } else if (SECCIONES.indexOf(colA) >= 0) {
      // ── Header de sección ─────────────────────────────────────────────
      range3.merge();
      rangeA.setValue(colA);
      range3.setBackground(C_SECTION_BG)
            .setFontColor(C_SECTION_FG)
            .setFontWeight('bold')
            .setFontSize(10)
            .setHorizontalAlignment('left');
      sheet.setRowHeight(row, 20);
      altCounter = 0;

    } else if (colA === '' && colB === 'Sala Principal') {
      // ── Sub-header Sala Principal / Sala Auxiliar ──────────────────────
      range3.setBackground(C_SALA_BG)
            .setFontColor(C_SALA_FG)
            .setFontStyle('italic')
            .setFontSize(9)
            .setHorizontalAlignment('center');
      sheet.setRowHeight(row, 18);

    } else {
      // ── Fila normal ───────────────────────────────────────────────────
      var bg = (altCounter % 2 === 0) ? C_ROW_BG : C_ROW_ALT_BG;
      range3.setBackground(bg)
            .setFontColor(C_ROW_FG)
            .setFontWeight('normal')
            .setFontStyle('normal')
            .setFontSize(10)
            .setHorizontalAlignment('left');
      sheet.setRowHeight(row, 20);
      altCounter++;
    }

    // Borde inferior fino en todas las filas
    range3.setBorder(false, false, true, false, false, false, C_BORDER, SpreadsheetApp.BorderStyle.SOLID);
  }
}

// ─── Limpiar merges en un rango de una fila ──────────────────────────────────
function _clearMerges(sheet, row, col) {
  try {
    sheet.getRange(row, col, 1, 3).breakApart();
  } catch(e) {}
}
