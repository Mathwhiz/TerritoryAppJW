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
  return ContentService.createTextOutput('VM Sheets Script v1.0 — OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─── Obtener o crear hoja del mes ───────────────────────────────────────────
function _getOrCreateSheet(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.getRange(1, 1).setValue('Reunión Vida y Ministerio Cristianos');
    sheet.getRange(2, 1).setValue('Sala Auxiliar: ');
  }
  return sheet;
}

// ─── Actualizar encargado de sala auxiliar (fila 2) ─────────────────────────
function _setEncargadoAux(sheet, nombre) {
  while (sheet.getLastRow() < 2) sheet.appendRow(['']);
  sheet.getRange(2, 1).setValue(nombre ? 'Sala Auxiliar: ' + nombre : 'Sala Auxiliar: ');
}

// ─── Exportar mes completo (borra filas 3+ y reescribe) ─────────────────────
function _escribirMes(sheet, encargadoAux, semanas) {
  _setEncargadoAux(sheet, encargadoAux);

  var lastRow = sheet.getLastRow();
  if (lastRow >= 3) sheet.deleteRows(3, lastRow - 2);

  var allFilas = [];
  semanas.forEach(function(s) { allFilas = allFilas.concat(s.filas); });

  if (allFilas.length > 0) {
    sheet.getRange(3, 1, allFilas.length, 3).setValues(allFilas);
  }
}

// ─── Reemplazar una semana individual (busca header y sobreescribe) ──────────
function _reemplazarSemana(sheet, filas) {
  if (!filas || !filas.length) return;

  var headerText = String(filas[0][0]).trim();
  var lastRow    = sheet.getLastRow();

  if (lastRow < 3) {
    // Hoja vacía (solo filas 1-2) → append directo
    sheet.getRange(3, 1, filas.length, 3).setValues(filas);
    return;
  }

  var colA = sheet.getRange(3, 1, lastRow - 2, 1).getValues();

  // Extraer día de inicio del header nuestro (ej: "Semana del 06 al..." → "06")
  var diaMatch = headerText.match(/Semana del (\d{1,2})/i);
  var diaInicio = diaMatch ? diaMatch[1].replace(/^0/, '') : null; // sin cero inicial para comparar

  var startIdx = -1; // índice 0-based dentro de colA
  var endIdx   = colA.length - 1;

  for (var i = 0; i < colA.length; i++) {
    var val = String(colA[i][0]).trim();
    var esSemana = val.toLowerCase().indexOf('semana del') === 0;
    // Match exacto O match por día de inicio (tolerante con formato distinto)
    var esEstasSemana = val === headerText ||
      (esSemana && diaInicio !== null && val.match(/Semana del (\d{1,2})/i)?.[1]?.replace(/^0/, '') === diaInicio);
    if (esEstasSemana) {
      startIdx = i;
    } else if (startIdx >= 0 && esSemana) {
      endIdx = i - 1;
      break;
    }
  }

  var startRow = startIdx >= 0 ? startIdx + 3 : lastRow + 1; // 1-indexed

  if (startIdx >= 0) {
    var existingCount = endIdx - startIdx + 1;
    if (existingCount > filas.length) {
      sheet.deleteRows(startRow + filas.length, existingCount - filas.length);
    } else if (existingCount < filas.length) {
      sheet.insertRowsBefore(startRow, filas.length - existingCount);
    }
  }

  sheet.getRange(startRow, 1, filas.length, 3).setValues(filas);
}
