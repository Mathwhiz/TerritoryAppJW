/**
 * Apps Script — Vida y Ministerio (v2.4)
 * SETUP: Implementar → Gestionar implementaciones → editar → Nueva versión → Implementar
 */

var BG_VERDE  = '#38761D';
var BG_GRIS   = '#999999';
var BG_ORO    = '#BF9000';
var BG_ROJO   = '#990000';
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
  return ContentService.createTextOutput('VM Sheets Script v2.4 — OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

function _getOrCreateSheet(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) sheet = ss.insertSheet(nombre);
  return sheet;
}

function _setEncargadoAux(sheet, nombre) {
  while (sheet.getLastRow() < 2) sheet.appendRow(['']);
  sheet.getRange(2, 1).setValue(nombre ? 'Sala Auxiliar: ' + nombre : 'Sala Auxiliar: ');
}

function _escribirMes(sheet, encargadoAux, semanas) {
  // Limpiar hoja: contenido + formato + merges
  var lastRow = Math.max(sheet.getLastRow(), 3);
  var fullRange = sheet.getRange(1, 1, lastRow, 3);
  try { fullRange.breakApart(); } catch(e) {}
  fullRange.clearContent();
  fullRange.clearFormat();

  sheet.setColumnWidth(1, 550);
  sheet.setColumnWidth(2, 230);
  sheet.setColumnWidth(3, 200);

  // Fila 1
  sheet.getRange(1, 1).setValue('Reunión Vida y Ministerio Cristianos');
  // Fila 2
  sheet.getRange(2, 1).setValue(encargadoAux ? 'Sala Auxiliar: ' + encargadoAux : 'Sala Auxiliar: ');

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
  var startIdx  = -1, endIdx = colA.length - 1;

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
    if (existingCount > filas.length)
      sheet.deleteRows(startRow + filas.length, existingCount - filas.length);
    else if (existingCount < filas.length)
      sheet.insertRowsBefore(startRow + existingCount, filas.length - existingCount);
  }
  _writeFilasConFormato(sheet, startRow, filas);
}

// ─── Formateo optimizado: ~10 llamadas para todo el mes ──────────────────────
function _writeFilasConFormato(sheet, startRow, filas) {
  var n = filas.length;
  if (!n) return;

  // 1. Escribir todos los valores de un golpe
  sheet.getRange(startRow, 1, n, 3).setValues(filas);

  // 2. Clasificar filas por tipo (sin llamadas a API)
  var rSemana = [], rTesoros = [], rSeamos = [], rVC = [], rSalaHdr = [];

  for (var i = 0; i < n; i++) {
    var r    = startRow + i;
    var colA = String(filas[i][0] || '').trim();
    var colB = String(filas[i][1] || '').trim();
    var ac   = 'A' + r + ':C' + r;

    if (colA.toLowerCase().indexOf('semana del') === 0) {
      rSemana.push(ac);
    } else if (colA === 'Tesoros de la Biblia') {
      rTesoros.push(ac);
    } else if (colA === 'Seamos Mejores Maestros') {
      rSeamos.push(ac);
    } else if (colA === 'Nuestra Vida Cristiana') {
      rVC.push(ac);
    } else if (colA === '' && colB === 'Sala Principal') {
      rSalaHdr.push('B' + r + ':C' + r);
    }
  }

  // 3. Merges A:C solo para headers (~16 rangos, 1 llamada)
  var toMerge = rSemana.concat(rTesoros, rSeamos, rVC);
  if (toMerge.length) {
    try { sheet.getRangeList(toMerge).breakApart(); } catch(e) {}
    sheet.getRangeList(toMerge).merge();
  }

  // 4. Fondos (5 llamadas)
  if (rSemana.length)  sheet.getRangeList(rSemana).setBackground(BG_VERDE);
  if (rTesoros.length) sheet.getRangeList(rTesoros).setBackground(BG_GRIS);
  if (rSeamos.length)  sheet.getRangeList(rSeamos).setBackground(BG_ORO);
  if (rVC.length)      sheet.getRangeList(rVC).setBackground(BG_ROJO);
  if (rSalaHdr.length) sheet.getRangeList(rSalaHdr).setBackground(BG_ORO);

  // 5. Texto blanco + negrita en headers (2 llamadas)
  var allHdrs = toMerge.concat(rSalaHdr);
  if (allHdrs.length) {
    sheet.getRangeList(allHdrs).setFontColor(FG_BLANCO).setFontWeight('bold').setHorizontalAlignment('center');
  }

  // 6. Fila 1 y 2: formato especial (2 llamadas)
  sheet.getRange(startRow - (startRow > 2 ? 0 : 0), 1); // no-op, solo para claridad
  if (startRow === 3) {
    // Solo al escribir el mes completo
    sheet.getRange(1, 1, 1, 3).merge();
    sheet.getRange(1, 1).setBackground(BG_VERDE).setFontColor(FG_BLANCO)
      .setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
    sheet.getRange(2, 1, 1, 3).merge();
    sheet.getRange(2, 1).setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
  }
}
