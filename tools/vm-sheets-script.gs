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

var BG_VERDE  = '#38761D';  // título + header semana
var BG_GRIS   = '#999999';  // Tesoros de la Biblia
var BG_ORO    = '#BF9000';  // Seamos + sub-header sala
var BG_ROJO   = '#990000';  // Nuestra Vida Cristiana
var FG_BLANCO = '#FFFFFF';
var FG_NEGRO  = '#000000';
var BG_BLANCO = '#FFFFFF';

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
  return ContentService.createTextOutput('VM Sheets Script v2.2 — OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

function _getOrCreateSheet(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) sheet = ss.insertSheet(nombre);
  return sheet;
}

// ─── Fila 2: sala auxiliar ───────────────────────────────────────────────────
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

// ─── Exportar mes completo ────────────────────────────────────────────────────
function _escribirMes(sheet, encargadoAux, semanas) {
  // Limpiar hoja
  var lastRow = sheet.getLastRow();
  if (lastRow >= 1) {
    try { sheet.getRange(1, 1, Math.max(lastRow, 3), 3).breakApart(); } catch(e) {}
    sheet.clearContents();
    sheet.clearFormats();
  }

  sheet.setColumnWidth(1, 550);
  sheet.setColumnWidth(2, 230);
  sheet.setColumnWidth(3, 200);

  // Fila 1 — título
  try { sheet.getRange(1, 1, 1, 3).breakApart(); } catch(e) {}
  sheet.getRange(1, 1, 1, 3).merge();
  sheet.getRange(1, 1)
    .setValue('Reunión Vida y Ministerio Cristianos')
    .setBackground(BG_VERDE).setFontColor(FG_BLANCO)
    .setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center');

  // Fila 2 — sala auxiliar
  _setEncargadoAux(sheet, encargadoAux);

  // Armar array de todas las filas
  var allFilas = [];
  semanas.forEach(function(s) { allFilas = allFilas.concat(s.filas); });

  if (allFilas.length > 0) {
    _writeFilasConFormato(sheet, 3, allFilas);
  }
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
    if (esEsta)          { startIdx = i; }
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

// ─── Escribir filas con formato (operaciones en batch) ───────────────────────
function _writeFilasConFormato(sheet, startRow, filas) {
  var n = filas.length;
  if (!n) return;

  // 1. Escribir todos los valores de un golpe
  sheet.getRange(startRow, 1, n, 3).setValues(filas);

  // 2. Deshacer todos los merges del rango de un golpe
  try { sheet.getRange(startRow, 1, n, 3).breakApart(); } catch(e) {}

  // 3. Clasificar filas y acumular listas de rangos por tipo
  // Tipos: 'semana', 'tesoros', 'seamos', 'vc', 'sala', 'normal_bold', 'normal'
  var rSemana = [], rTesoros = [], rSeamos = [], rVC = [];
  var rSalaBg = [], rSalaTexto = [];   // sala sub-header: B y C separados
  var rNormalBold = [], rNormal = [];
  var rMergeAC = [];     // merges A:C
  var rMergeBC = [];     // merges B:C (nombre único sin sala aux)

  var SECCIONES = {
    'Tesoros de la Biblia':    'tesoros',
    'Seamos Mejores Maestros': 'seamos',
    'Nuestra Vida Cristiana':  'vc',
  };

  for (var i = 0; i < n; i++) {
    var r    = startRow + i;
    var colA = String(filas[i][0] || '').trim();
    var colB = String(filas[i][1] || '').trim();
    var colC = String(filas[i][2] || '').trim();
    var a1   = 'A' + r, b1 = 'B' + r, c1 = 'C' + r;
    var ac   = 'A' + r + ':C' + r;
    var bc   = 'B' + r + ':C' + r;

    if (colA.toLowerCase().indexOf('semana del') === 0) {
      rSemana.push(ac);
      rMergeAC.push(r);
    } else if (SECCIONES[colA]) {
      var tipo = SECCIONES[colA];
      if (tipo === 'tesoros')  rTesoros.push(ac);
      if (tipo === 'seamos')   rSeamos.push(ac);
      if (tipo === 'vc')       rVC.push(ac);
      rMergeAC.push(r);
    } else if (colA === '' && colB === 'Sala Principal') {
      rSalaBg.push(b1);
      rSalaBg.push(c1);
      rSalaTexto.push(b1);
      rSalaTexto.push(c1);
      rNormal.push(a1);  // la celda A de esta fila: fondo blanco
    } else {
      // fila normal
      if (colC !== '') {
        // dos nombres → sin merge
        if (_esNegritaA(colA)) rNormalBold.push(a1); else rNormal.push(a1);
        rNormal.push(bc);
      } else if (colB !== '') {
        // un nombre → merge B:C
        if (_esNegritaA(colA)) rNormalBold.push(a1); else rNormal.push(a1);
        rMergeBC.push(r);
        rNormal.push(b1);
      } else {
        // sin nombre
        if (_esNegritaA(colA)) rNormalBold.push(a1); else rNormal.push(a1);
      }
    }
  }

  // 4. Aplicar merges (A:C y B:C)
  rMergeAC.forEach(function(r) {
    try { sheet.getRange(r, 1, 1, 3).merge(); } catch(e) {}
  });
  rMergeBC.forEach(function(r) {
    try { sheet.getRange(r, 2, 1, 2).merge(); } catch(e) {}
  });

  // 5. Aplicar fondos en batch
  _setRangeListProp(sheet, rSemana,      'setBackground',    BG_VERDE);
  _setRangeListProp(sheet, rTesoros,     'setBackground',    BG_GRIS);
  _setRangeListProp(sheet, rSeamos,      'setBackground',    BG_ORO);
  _setRangeListProp(sheet, rVC,          'setBackground',    BG_ROJO);
  _setRangeListProp(sheet, rSalaBg,      'setBackground',    BG_ORO);
  _setRangeListProp(sheet, rNormal,      'setBackground',    BG_BLANCO);
  _setRangeListProp(sheet, rNormalBold,  'setBackground',    BG_BLANCO);

  // 6. Colores de texto
  var rHeaders = rSemana.concat(rTesoros, rSeamos, rVC);
  _setRangeListProp(sheet, rHeaders,     'setFontColor',     FG_BLANCO);
  _setRangeListProp(sheet, rSalaTexto,   'setFontColor',     FG_BLANCO);
  _setRangeListProp(sheet, rNormal,      'setFontColor',     FG_NEGRO);
  _setRangeListProp(sheet, rNormalBold,  'setFontColor',     FG_NEGRO);

  // 7. Bold
  _setRangeListProp(sheet, rHeaders,     'setFontWeight',    'bold');
  _setRangeListProp(sheet, rSalaTexto,   'setFontWeight',    'bold');
  _setRangeListProp(sheet, rNormalBold,  'setFontWeight',    'bold');
  _setRangeListProp(sheet, rNormal,      'setFontWeight',    'normal');

  // 8. Tamaño de fuente
  var rGrandes = rSemana;   // 12pt
  var rMedios  = rTesoros.concat(rSeamos, rVC, rSalaTexto);  // 11pt
  var rChicos  = rNormal.concat(rNormalBold);  // 10pt
  _setRangeListProp(sheet, rGrandes,     'setFontSize',      12);
  _setRangeListProp(sheet, rMedios,      'setFontSize',      11);
  _setRangeListProp(sheet, rChicos,      'setFontSize',      10);

  // 9. Alineación
  _setRangeListProp(sheet, rHeaders,     'setHorizontalAlignment', 'center');
  _setRangeListProp(sheet, rSalaTexto,   'setHorizontalAlignment', 'center');
  _setRangeListProp(sheet, rNormalBold,  'setHorizontalAlignment', 'left');
  // Para los nombres (B/C en filas normales) centrar
  var rNombres = [];
  for (var i = 0; i < n; i++) {
    var r    = startRow + i;
    var colA = String(filas[i][0] || '').trim();
    var colB = String(filas[i][1] || '').trim();
    if (colA !== '' && colA.toLowerCase().indexOf('semana del') < 0 && !SECCIONES[colA] && !(colA === '' && colB === 'Sala Principal')) {
      rNombres.push('B' + r);
      if (String(filas[i][2] || '').trim() !== '') rNombres.push('C' + r);
    }
  }
  _setRangeListProp(sheet, rNombres, 'setHorizontalAlignment', 'center');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Aplicar una propiedad en batch a una lista de notaciones A1
function _setRangeListProp(sheet, a1List, method, value) {
  if (!a1List || !a1List.length) return;
  try {
    sheet.getRangeList(a1List)[method](value);
  } catch(e) {}
}

// ¿Columna A de fila normal va en negrita?
function _esNegritaA(colA) {
  var lower = colA.toLowerCase();
  return lower.indexOf('oraci') === 0 || lower.indexOf('1.') === 0;
}
