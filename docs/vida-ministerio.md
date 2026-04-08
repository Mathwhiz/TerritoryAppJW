## Módulo de Vida y Ministerio

Módulo para el **presidente de la reunión VM**: importar programa de WOL, asignar partes,
gestionar publicadores por rol VM, sala auxiliar.

**Estado al 2026-04-08:** Fases 1, 2, sala auxiliar, historial Excel, semanas especiales (UI+generador),
PIN VM, navegación, vista mensual, editar títulos, duración visible, export/compartir, visor público,
menú Encargado centrado, filtros en vista Hermanos, Lista de Hermanos en encargado VM, dirty state con aviso de guardado — todos ✅.
**Fase 4 auto-asignación:** ✅ implementada (colas democráticas por historial completo + restricción de género en ayudantes).

### Visor público (`programa.html`)
Página standalone sin PIN. URL: `vida-ministerio/programa.html?congre=sur&semana=2026-04-07`.
Sin `semana` muestra la semana actual. Navegación ← →, botón compartir copia URL al portapapeles.

Estilo: card con `border: 0.5px solid #2e2e2e; border-radius: 16px; background: #1e2023`.
Secciones dentro de la card separadas por `border-bottom: 0.5px solid #2a2a2a` con radios en primera/última.

`pubFecha` se normaliza siempre a `YYYY-MM-DD` via `parseFechaIso()` antes de cualquier operación
de fecha — evita el bug donde fechas en formato legacy `DD/MM/YYYY` rompían la navegación.

### `parseFechaIso(f)` — utilidad interna en `app.js`

Normaliza cualquier formato de fecha a `YYYY-MM-DD`. Si no puede parsear, retorna `lunesDeHoy()`.

```js
function parseFechaIso(f) {
  if (!f) return lunesDeHoy();
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
    const [dd, mm, yyyy] = f.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return lunesDeHoy();
}
```

Usar siempre antes de aritmética de fechas o antes de guardar `pubFecha`.
`fmtDisplay(iso)` también llama `parseFechaIso` internamente como defensa.

### Encargado VM — menú post-PIN

Layout centrado full-height (igual a Asignaciones): título + subtítulo congregación, luego columna
de botones con **`min-width:320px` inline** (no en clase CSS — evita problemas de caché).

- Botón "Programa" → `goToTabsSemanas()` (tabs: Semanas / Generar Semanas)
- Botón "Hermanos" → `goToHermanos()` (lista con filtros de rol y búsqueda)
- Botón "Lista de Hermanos" → `goToListaHermanos()` (CRUD completo, igual al módulo Administrador — ver sección abajo)
- Botón "Cerrar sesión" → `cerrarSesionVM()` (resetea `modoEncargado`, vuelve a cover)

**Importante:** el layout del enc-menu usa `style` inline en el HTML, **no clases CSS**,
porque los cambios de clase no siempre se reflejan si el CSS está cacheado en el browser.

### Vista Hermanos VM

Filtros en la parte superior:
1. **Select de rol** (`#vm-hermanos-rol`) — dropdown con los 11 roles VM
2. **Input de búsqueda** (`#vm-hermanos-search`) — filtra por nombre

Ambos llaman `filtrarHermanosVM()`. `goToHermanos()` los resetea al entrar (vacía el texto, select a "Todos").
La lista renderizada por `renderHermanosVM()` muestra chips de rol por publicador.

### Firestore — doc semana

```js
// vidaministerio/{semanaId}   semanaId = "YYYY-MM-DD" (lunes)
{
  fecha: "2026-03-23",
  cancionApertura: 123, cancionIntermedia: 456, cancionCierre: 789,
  presidente: "pubId", oracionApertura: "pubId", oracionCierre: "pubId",

  tesoros: {
    discurso:       { titulo: "...", duracion: 10, pubId: null },
    joyas:          { titulo: "Perlas escondidas", duracion: 10, pubId: null },
    lecturaBiblica: { titulo: "Lea Hechos 7:1-16 (N min.)", duracion: 4, pubId: null, ayudante: null,
                      salaAux: { pubId: null, ayudante: null } }  // si tieneAuxiliar
  },

  ministerio: [
    { titulo: "...", tipo: "video"|"discurso"|"demostracion", duracion: N,
      pubId: null, ayudante: null,
      salaAux: { pubId: null, ayudante: null } },  // si tieneAuxiliar y tipo != discurso
  ],

  vidaCristiana: [
    { titulo: "...", tipo: "parte"|"estudio_biblico", duracion: N, pubId: null, ayudante: null },
  ],

  tipoEspecial: null | "conmemoracion" | "superintendente" | "asamblea",
  importadoDeWOL: true,
  creadoEn: timestamp
}
```

### Roles VM en publicadores
`VM_PRESIDENTE`, `VM_ORACION`, `VM_TESOROS`, `VM_JOYAS`, `VM_LECTURA`,
`VM_MINISTERIO_CONVERSACION`, `VM_MINISTERIO_REVISITA`, `VM_MINISTERIO_ESCENIFICACION`,
`VM_MINISTERIO_DISCURSO`, `VM_VIDA_CRISTIANA`, `VM_ESTUDIO_CONDUCTOR`

**Restricciones de género y privilegio** (aplicadas en la UI de Lista de Hermanos):

| Condición | Roles disponibles |
|-----------|-------------------|
| Mujer | Solo `VM_MINISTERIO_CONVERSACION`, `VM_MINISTERIO_REVISITA`, `VM_MINISTERIO_ESCENIFICACION`. Sin roles de Asignaciones. |
| Varón sin privilegio (sin `ANCIANO` ni `SIERVO_MINISTERIAL`) | `VM_LECTURA` + los tres ministerio de mujer. |
| Varón anciano o siervo ministerial | Todos los roles VM + todos los de Asignaciones. |

La visibilidad de checkboxes se actualiza en `_lhActualizarRolesSegunSexo()` llamada al abrir el modal y al cambiar el botón de sexo. El estado de privilegio (`_lhModalPrivilegiado`) se lee de `h.roles` al abrir; no cambia dentro del modal (se gestiona desde Administrador).

### Lista de Hermanos en VM (`#view-lista-hermanos`)

CRUD completo de publicadores accesible desde el menú del encargado VM, con la misma funcionalidad que el módulo Administrador. Usa el mismo array `publicadores` ya cargado en memoria.

**Funciones globales:** `goToListaHermanos`, `filtrarListaHermanosVM`, `abrirEditarVM`, `abrirNuevoVM`, `cerrarModalHermanoVM`, `guardarHermanoVM`, `confirmarEliminarVM`, `toggleSexoVM`, `selectSexoVM`, `navHermanoVM`

**Estado interno:** `_lhListaVisible`, `_lhEditandoId`, `_lhModalSexo`, `_lhModalPrivilegiado`

**Modal `#modal-hermano-vm`:** nombre, sexo (H/M), roles VM en grid 2 col, sección `#lh-seccion-asign` con roles de Asignaciones (oculta para mujeres), navegación prev/next entre hermanos, botón eliminar.

### Aviso de cambios sin guardar (dirty state)

`_semanaModificada` (boolean) se activa con cualquier cambio en la semana abierta.

| Evento que activa | Función |
|-------------------|---------|
| Asignar/quitar hermano | `setSlotPubId` |
| Editar título, canción, instrucción | `onTituloChange`, `onInstruccionChange` |
| Agregar/quitar parte | `agregarParte`, `quitarParte` |
| Auto-asignar | `autocompletarHermanos` |
| Importar WOL | `reimportarDeWOL` → `aplicarWOLaSemana` |

Al navegar (`navSemana`, `goToSemanas`, `goToMenuEnc`) se llama `_confirmarSiModificada()`: muestra `uiConfirm` con opciones "Guardar" y "Descartar". El botón Guardar muestra un asterisco (`"Guardar *"`) como indicador visual mientras hay cambios pendientes. Al guardar o cargar una semana nueva, el flag se resetea.

### Importación WOL (✅)
URL: `https://wol.jw.org/es/wol/dt/r4/lp-s/{año}/{mes}/{día}` via Cloudflare Worker propio.
Parser usa `h3/h4` numerados — **no usar IDs `#pN`** (varían cada semana).
- Títulos en `h3/h4` con texto `"N. Título..."`. Tesoros: siempre los primeros 3 `h3` numerados.
- Frontera Ministerio/VC: `h3` con texto exactamente `"Canción N"`.
- Duración: primer `"(X mins.)"` después del `h3` correspondiente.

### Detección de tipo de parte ministerio

```js
function tipoMinisterioDesdeWOL(titulo, instruccion) {
  const t = (titulo + ' ' + (instruccion || '')).toLowerCase();
  if (t.includes('conversación') || t.includes('conversacion')) return 'conversacion';
  if (t.includes('revisita'))      return 'revisita';
  if (t.includes('escenificación') || t.includes('escenificacion')) return 'escenificacion';
  if (t.includes('discurso'))      return 'discurso'; // varón anciano/SM, sin ayudante
  return 'conversacion';
}
// tipo === 'discurso' → sin ayudante. Los demás → tienen ayudante.
// Se pasa también `instruccion` (texto de instrucción de WOL) porque la palabra "Discurso"
// puede aparecer ahí y no en el h3 del título.
```

### Semanas especiales (`tipoEspecial`)

| Valor | Efecto |
|-------|--------|
| `"conmemoracion"` | Entre semana: no hay reunión VM. No generar roles VM/entre semana. |
| `"superintendente"` | Reunión pasa de miércoles a martes. Estudio reemplazado por discurso del sup. Finde sin lector. |
| `"asamblea"` | No hay ninguna reunión esa semana. No generar nada. |

### Fase 4 — Auto-asignación VM (✅ implementada)

**Dónde está el código:** bloque `// AUTO-ASIGNACIÓN VM (Fase 4)` en `vida-ministerio/app.js`,
justo antes de `window.autocompletarHermanos`.

#### Funciones (todas en `app.js`)

| Función | Qué hace |
|---------|----------|
| `construirSlotsOrdenados(semana)` | Retorna `[{key, rolRequerido, esAyudante?, esSalaAux?}]` en orden canónico para una semana dada |
| `getSlotPubIdFromSemana(semana, key)` | Lee un pubId de un objeto semana arbitrario (mismo switch que `getSlotPubId` pero sin usar el global) |
| `setSlotPubIdOnSemana(semana, key, pubId)` | Escribe un pubId en un objeto semana arbitrario (mismo switch que `setSlotPubId` pero sin usar el global) |
| `calcularColasVM()` | Lee todo `semanasLista` (historial completo, orden asc) y retorna `{rolId: [pubId, ...]}` ordenado por "menos usado recientemente" — democrático real |
| `autoAsignarSemana(semana, colas, {soloVacios})` | Loop principal. Modifica `semana` in-place, `colas` se actualiza in-place para generación masiva. Opción `soloVacios` respeta slots ya asignados. |
| `debeSkipAutoAsignar(fecha)` | Retorna `true` si la semana debe saltarse: `asamblea` siempre, `conmemoracion` solo si es entre semana |
| `sexoDePub(pubId)` | Retorna `'H'`, `'M'` o `null` leyendo `publicadores` en memoria |

#### Orden de slots en `construirSlotsOrdenados`

1. `presidente` → `VM_PRESIDENTE`
2. `oracionApertura` → `VM_ORACION`
3. `oracionCierre` → `VM_ORACION`
4. `tesoros.discurso` → `VM_TESOROS`
5. `tesoros.joyas` → `VM_JOYAS`
6. `tesoros.lecturaBiblica` → `VM_LECTURA`
7. (si `tieneAuxiliar`) `tesoros.lecturaBiblica.ayudante`
8. Por cada `ministerio[i]`: pubId + ayudante (si tipo ≠ discurso) + salaAux pair (si `tieneAuxiliar`)
9. Por cada `vidaCristiana[i]`: pubId → `VM_VIDA_CRISTIANA`
10. `estudio.conductor` → `VM_ESTUDIO_CONDUCTOR`

#### Reglas manejadas por `enEstaSemana Set`

- `VM_ORACION` apertura ≠ cierre (mismo rol, el segundo saltea al primero automáticamente)
- Presidente ≠ oración (presidente se asigna primero; ya está en el Set cuando llegan las oraciones)
- Sala auxiliar ≠ sala principal (el pubId de salaAux va después del principal)
- **Ayudante mismo sexo que principal**: antes de asignar un slot `esAyudante`, se lee el sexo del principal con `sexoDePub()` y se filtra la cola para que coincida. Si no hay nadie del mismo sexo disponible, el slot queda en `null`.

#### Invariante anti-loop

El `while` del diseño original se reemplazó por `for (intentos < lista.length + 1)` — si todos
están en `enEstaSemana`, deja el slot en `null` y avanza el índice. Evita loop infinito con listas de 1 persona.

#### Colas: sin persistencia separada

Las colas **no se guardan en Firestore**. Se recalculan siempre desde `semanasLista` (historial completo en memoria).
En generación masiva, `colasAA` se calcula una vez antes del loop y se pasa mutable a cada llamada de `autoAsignarSemana`, acumulando el avance semana a semana.

#### Entrada al usuario

- **Botón "✦ Auto"** en `view-semana` → `autocompletarHermanos()` → pide confirmación (`uiConfirm purple`), luego `calcularColasVM()` + `autoAsignarSemana(semanaData, colas, { soloVacios: true })` + `renderSemanaEdit()`. **No guarda automáticamente** — el encargado revisa y presiona "Guardar".
- **Checkbox `#nueva-auto-asignar`** en tab "Generar Semanas" → al generar N semanas, si está activo y la semana no debe saltarse, llama `autoAsignarSemana(semanaData, colasAA)` antes del `setDoc`.

#### Para modificar en el futuro

- **Cambiar orden de prioridad de slots:** editar el orden en `construirSlotsOrdenados`.
- **Agregar regla de exclusión** (ej: una persona no puede ser presidente Y conductor en la misma semana): sumar la restricción dentro del `for (intentos...)` en `autoAsignarSemana` — el `enEstaSemana` Set ya maneja el caso más común.
- **Opción "no sobreescribir slots ya asignados":** en `autoAsignarSemana`, antes de asignar, chequear `getSlotPubIdFromSemana(semana, slot.key)` y saltear si no es null.
- **Persistir índices entre sesiones:** guardar `indicesAA` en `congregaciones/{id}` campo `vmIndicesRondas` y leerlo al init. Actualmente se recalcula desde historial (más robusto).
