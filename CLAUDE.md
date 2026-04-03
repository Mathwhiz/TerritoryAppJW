# CLAUDE.md — AppJW (repo: AppJWCongSur)

Repo **oficial** de la Territory App para **múltiples congregaciones**, hosteada en `congsur.lat`.
Migrado desde el fork de desarrollo (`testpa`) donde se migró el backend
de Google Apps Script + Google Sheets a **Firebase Firestore**, y se agregó soporte
**multi-congregación**.

La migración está **completa**. No hay más llamadas a Apps Script (salvo el botón
opcional "Guardar también en planilla" del módulo de asignaciones).

---

## Arquitectura (Firestore)

```
congregaciones/{congreId}/
  ├── (doc: nombre, pinEncargado, color, creadoEn, scriptUrl?, sheetsUrl?,
  │         pinVidaMinisterio?, tieneAuxiliar?,
  │         ciudadPrincipal?, ciudadesExtras?)
  ├── grupos/{grupoId}         → id, label, color, pin
  ├── territorios/{terrId}     → id, nombre, tipo, grupoId, punto, poligonos, ciudad?, notas?
  │   └── historial/{entryId} → conductor, fechaInicio, fechaFin
  ├── salidas/{salidaId}       → grupoId, fechaReg, salidas[]
  ├── publicadores/{pubId}     → nombre, roles, activo
  ├── asignaciones/{docId}     → fecha, diaSemana, roles
  ├── semanasEspeciales/{lunesISO} → tipo, fechaEvento
  ├── chatNotas/grupo_{grupoId}/mensajes → autor, texto, createdAt, canal, grupo
  ├── chatNotas/congregacion/mensajes   → autor, texto, createdAt, canal, grupo
  └── vidaministerio/{semanaId} → fecha, canciones, presidente, oraciones, tesoros, ministerio[], vidaCristiana[], tipoEspecial?

config/superadmin              → pin  ← PIN del panel de admin

usuarios/{uid}                 → perfil de usuario (ver sección Auth)
```

### Campos opcionales del doc de congregación

| Campo | Descripción |
|-------|-------------|
| `color` | Hex del color de la card en index.html. Si no existe, se deriva por hash del ID. |
| `scriptUrl` | URL del Apps Script de asignaciones. Activa "Guardar también en planilla". |
| `sheetsUrl` | URL del Google Sheets. Activa "Ver planilla" en Administrador. |
| `pinVidaMinisterio` | PIN del módulo VM (default `"1234"`). |
| `tieneAuxiliar` | `bool` — activa la sala auxiliar en el módulo VM. |
| `ciudadPrincipal` | Nombre de la ciudad principal (ej: `"Santa Rosa"`). |
| `ciudadesExtras` | Array `[{ nombre, offset }]` — ciudades extra con su offset de IDs (+1000, +2000…). |

### Navegación

1. `index.html` — elige congregación **y** módulo
   - La congregación se persiste en `localStorage` (`ziv_congre_id`, `ziv_congre_nombre`, `ziv_congre_color`)
   - Si hay congregación guardada + sesión Firebase activa → salta directo al menú de módulos
   - Si hay congregación pero sin sesión Firebase → muestra `#view-auth` (Google o Anónimo)
   - "← Congregaciones" limpia `sessionStorage` pero **no** `localStorage` (se recuerda en próxima visita)
2. `territorios/index.html`, `asignaciones/index.html`, `vida-ministerio/index.html` o `hermanos/index.html`
3. Al volver ("← Volver al módulo") → `../index.html` → muestra vista 2 automáticamente

El ID de congregación es un slug legible (ej: `"sur"`, `"norte"`), elegido al crear.

---

## Estructura de archivos

```
/
├── index.html              # SPA: elegir congregación → auth → módulo
├── perfil.html             # Perfil de usuario: primer login y edición posterior
├── admin.html              # Panel de superadmin (URL + PIN)
├── admin.js                # Lógica del panel de admin
├── firebase.js             # Inicialización compartida de Firebase (exporta `db` y `auth`)
├── auth.js                 # Auth: Google sign-in, anónimo, perfiles, session header
├── auth-config.js          # Roles de app + mapa de permisos (único lugar a editar)
├── ui-utils.js             # Componentes UI: modales, pickers, loading, toast, session header
├── favicon.svg
├── territorios/
│   ├── index.html          # App de territorios
│   ├── app.js              # Lógica principal (100% Firestore)
│   ├── styles.css
│   └── mapa.html           # Mapa Leaflet — polígonos desde Firestore
├── asignaciones/
│   ├── index.html          # App de asignaciones
│   ├── app.js              # Lógica de asignaciones (100% Firestore)
│   └── styles.css
├── vida-ministerio/
│   ├── index.html          # App de VM
│   ├── app.js              # Lógica principal
│   ├── programa.html       # Visor público solo lectura (sin PIN)
│   ├── programa.js         # Lógica del visor público
│   └── styles.css
├── hermanos/
│   ├── index.html          # Módulo Administrador (publicadores + semanas especiales)
│   ├── app.js
│   └── styles.css
└── tools/                  # Scripts de migración y sync (conservar como referencia)
    ├── kml_to_json.py
    ├── migrate_sheets.py
    ├── upload_territorios.py
    ├── sync_historial.py
    ├── import_vm_historial.py   # Importa historial VM desde Excel → Firestore
    ├── codigodeappscript        # Apps Script de asignaciones (Congregación Sur)
    ├── territorios_sur.json
    └── congregacionsur.kml
    # *.xlsx y serviceAccountKey.json → en .gitignore, nunca commitear
```

---

## Panel de Admin (`admin.html`)

Acceso: URL directa → PIN (desde `config/superadmin → { pin }` en Firestore).

**Funcionalidades:**
- Listar congregaciones existentes
- **Crear congregación** (wizard 3 pasos):
  1. Nombre + ID slug + PIN encargado + PIN VM + **color** (random de paleta, editable) + ciudad principal
  2. Configurar grupos: label, color, PIN
  3. KML ciudad principal (opcional) + **ciudades extra** (nombre + KML c/u, IDs con offset automático)
- **Editar** congregación (mismos campos)
- **Eliminar** congregación (borra todas las subcolecciones)
- **Asignar territorios a grupos** (📍): lista con filtros, batch update

**Paleta de colores** (`PALETA_COLORES`):
`#378ADD`, `#97C459`, `#7F77DD`, `#EF9F27`, `#1D9E75`, `#D85A30`

**KML parser** (`parseKML`):
- Soporta `"1"`, `"92a"`, `"Territorio 1"`, `"Territorio 1a"`
- Para ciudades extra: `id = parsedNum + offset` (ej: territorio 1 de ciudad extra 1 → ID 1001)
- El campo `ciudad` se setea al momento de guardar (no al parsear el KML)

---

## Stack

- **Frontend:** HTML + CSS + JS vanilla (sin frameworks, sin bundler)
- **Hosting:** GitHub Pages (repo AppJWCongSur), dominio `congsur.lat`
- **Base de datos:** Firebase Firestore (`appjw-3697e`)
- **Auth:** Firebase Authentication — Google + Anónimo (coexiste con PINs)
- **Mapa:** Leaflet.js + OpenStreetMap
- **Imagen para compartir:** html2canvas (CDN)
- **Analytics:** PostHog

---

## Firebase

```js
import { db }         from '../firebase.js';   // Firestore
import { db, auth }   from '../firebase.js';   // Firestore + Auth
import '../auth.js';                            // activa session header y globals de auth
```

- Firebase SDK 11.6.0 (ES modules via gstatic CDN)
- Scripts con firebase.js necesitan `type="module"` en el HTML
- `auth.js` está importado en todos los `app.js` de módulos — activa el session header automáticamente

---

## Sistema de Auth y Perfiles (✅ implementado)

### Flujo de entrada

```
Abrir app
  └─ ¿hay congregación en localStorage?
       SÍ → ¿hay sesión Firebase activa?
              Google/Anónima → menú de módulos directo
              Sin sesión     → view-auth (sign-in o skip)
       NO  → selector de congregaciones → view-auth
```

### Proveedores activos en Firebase Console
- **Google** — sign-in completo con perfil
- **Anónimo** — acceso inmediato sin fricción ("Omitir por ahora")

### Documento de usuario (`usuarios/{uid}`)

```js
{
  uid:               "firebase-uid",
  email:             "user@gmail.com" | null,
  displayName:       "Juan Pérez"    | null,
  photoURL:          "https://..."   | null,
  birthDate:         "1990-05-15"    | null,   // YYYY-MM-DD
  sexo:              "H" | "M"       | null,
  matchedPublisherId: "pubId"        | null,   // ref a publicadores/{id}
  congregacionId:    "sur"           | null,
  appRol:            "publicador",             // ver roles en auth-config.js
  matchEstado:       "ok" | "pendiente" | "sin_match" | "anonimo",
  isAnonymous:       false,
  primerLogin:       false,
  createdAt:         timestamp,
}
```

### Roles y permisos (`auth-config.js`)

Único archivo a editar para cambiar qué puede hacer cada rol.

| Rol | Descripción |
|-----|-------------|
| `admin_general` | Acceso a todo, incluyendo `admin.html` |
| `admin_congre` | Todos los módulos de una congregación |
| `encargado_asignaciones` | Asignaciones + Administrador |
| `encargado_vm` | Vida y Ministerio + Administrador |
| `encargado_grupo` | Territorios |
| `anciano` | Territorios + VM |
| `siervo_ministerial` | Territorios |
| `precursor_regular` | Territorios |
| `precursor_auxiliar` | Territorios |
| `publicador` | Territorios |
| `anonimo` | Todos los módulos (igual que antes del sistema de perfiles) |
| `pendiente` | Sin acceso — match no confirmado por admin |

### Matching automático con publicadores

Al registrarse con Google, `auth.js` intenta matchear `displayName` con `publicadores/{id}.nombre`:
1. Coincidencia exacta (normalizado: lowercase, sin tildes)
2. Todos los tokens del nombre de Google presentes en el nombre del pub
3. Si ambiguo (`matchEstado: 'pendiente'`) → admin resuelve en `admin.html`

### API global expuesta por `auth.js`

| Función | Descripción |
|---------|-------------|
| `window.waitForAuth()` | Promise → resuelve con el usuario cuando `onAuthStateChanged` disparó |
| `window.currentUser` | Objeto usuario actual (null si no logueado) |
| `window.hasPermission(feature)` | Boolean — verifica `PERMISOS[appRol].includes(feature)` |
| `window.authGuard(feature)` | Async — redirige a `/?sin_acceso=1` si no tiene permiso |
| `window.signInWithGoogle()` | Abre popup de Google |
| `window.signInAnonymousUser()` | Crea sesión anónima |
| `window.linkWithGoogle()` | Vincula sesión anónima con Google → luego redirigir a `perfil.html` |
| `window.signOutUser()` | Cierra sesión Firebase |
| `window.updateUserProfile(data)` | Actualiza `usuarios/{uid}` en Firestore y en memoria |

### Session header (`ui-utils.js`)

Chip flotante fijo en `top: 12px; right: 12px` — aparece en todas las páginas que cargan `ui-utils.js`.

- Google: muestra foto (o iniciales) + primer nombre → menú: "Ver perfil" / "Cerrar sesión"
- Anónimo: ícono genérico + "Invitado" → menú: "Vincular con Google" / "Cerrar sesión"
- `window.updateSessionHeader(user)` — llamado por `auth.js` en cada cambio de estado
- `window.sessionSignOut()` — limpia localStorage + sessionStorage + Firebase + redirige a `/`
- `window.toggleSessionMenu()` / `window.closeSessionMenu()` — control del dropdown

### Persistencia de congregación

| Almacenamiento | Keys | Cuándo se escribe | Cuándo se borra |
|----------------|------|-------------------|-----------------|
| `localStorage` | `ziv_congre_id`, `ziv_congre_nombre`, `ziv_congre_color` | Al elegir congregación | Solo al cerrar sesión |
| `sessionStorage` | `congreId`, `congreNombre`, `congreColor` | Al elegir congregación o al restaurar desde localStorage | Al cerrar sesión o "← Congregaciones" |

**"← Congregaciones"** solo limpia `sessionStorage` → el usuario puede cambiar de congregación en esta pestaña, pero la próxima visita vuelve a la guardada.

### `perfil.html`

- Primer login (`primerLogin: true`): título "Completá tu perfil", botón "Guardar y continuar", setea `primerLogin: false`
- Edición (`primerLogin: false`): título "Tu perfil", botón "Guardar cambios"
- Usuarios anónimos: redirigidos a `/` (no tienen perfil)
- DOB picker custom con dropdown de año (año actual → 1900) y mes — sin `<input type="date">`

### Agregar guard a un módulo

```js
// Al inicio del app.js de cualquier módulo:
import '../auth.js';
await window.authGuard('acceso_territorios');
// → si no tiene permiso: redirige a /?sin_acceso=1
```

---

## Módulo de Territorios

### Chat / Notas compartidas (✅ implementado)

Canal interno de comunicación dentro de **Territorios**, implementado como **FAB flotante** (botón abajo-derecha, visible en todas las vistas post-login):

- **No es una vista separada** — es un overlay panel que se abre sobre cualquier vista
- Dos canales con tabs verticales a la izquierda del panel:
  - **Grupo** (notas del grupo logueado)
  - **Congregación** (notas visibles por todos)
- El autor del mensaje es siempre el nombre del **grupo logueado** (`"Grupo 1"`, `"Grupo 2"`, etc.) — independientemente del canal. Si se postea desde el canal Congregación, el autor sigue siendo el grupo. `"Congregación"` solo se usa si el `grupoId` es `'C'`.
- Mensajes **eliminables** (con popup de confirmación `uiConfirm`)
- Mensajes **editables solo por el autor** — autoría rastreada por `sessionStorage chatMisIds` (array de IDs de docs creados en la sesión)
- `showChatFab()` se llama desde `goToModo()` (post-login); `hideChatFab()` desde `goToCover()` / `cerrarSesion()`

**HTML:** `#chat-fab` (fixed bottom-right) + `#chat-overlay` con `#chat-panel` (`.chat-vtabs` + `.chat-panel-body`) + `#chat-edit-modal`

**Funciones globales:** `openChatPanel`, `closeChatPanel`, `switchChatScope`, `refreshChatNotas`, `sendChatNota`, `abrirEditNota`, `closeChatEdit`, `confirmarEditNota`, `eliminarNota`

**Estructura Firestore:**
- `congregaciones/{congreId}/chatNotas/grupo_{grupoId}/mensajes`
- `congregaciones/{congreId}/chatNotas/congregacion/mensajes`

Cada mensaje guarda: `autor` (nombre del grupo), `texto`, `createdAt`, `canal`, `grupo`.

### Grupos (vienen de Firestore en runtime)

| Grupo | Color | PIN (default) |
|-------|-------|---------------|
| 1 | `#378ADD` | 1111 |
| 2 | `#EF9F27` | 2222 |
| 3 | `#97C459` | 3333 |
| 4 | `#D85A30` | 4444 |
| Congregación | `#7F77DD` | 5555 |

### Territorios especiales
- Tipo `no_predica`: territorio 131
- Tipo `peligroso`: territorio 11

### Multi-ciudad (✅ implementado)

Algunas congregaciones predican en más de una ciudad. Soporte completo:
- Campo `ciudad` (string | null) en cada territorio: `null` = ciudad principal, `"Ataliva Roca"` = ciudad extra
- Territorios de ciudades extra siempre pertenecen al grupo `'C'` (Congregación)
- IDs con offset: ciudad extra 1 → +1000, ciudad extra 2 → +2000 (evita colisiones)
- `nombre` almacena el display (`"Territorio 1"`) independientemente del ID offset
- En `mapa.html` modo full: botones ciudad como filtro toggle con viewport dinámico (`maxBounds` + `minZoom` calculados desde polígonos reales de esa ciudad)
- En info grid ("ver mi grupo"): headers de ciudad cuando hay territorios de múltiples ciudades
- En picker de salidas: territorios de Congregación agrupados por ciudad

### Mapa (`mapa.html`)

Modos via URL params:
- `?modo=full` — mapa completo con filtros por grupo + botones de ciudad extra
- `?modo=info` — coloreado por días desde último uso
- `?modo=registrar&enprogreso=92,113,...` — solo territorios en progreso
- `?modo=picker&grupo=3&salidaid=2` — selector; devuelve resultado al padre via `postMessage`

Sub-polígonos usan sufijos letra (92a, 92b) que mapean al mismo territorio base.

### Tema claro / oscuro (estado actual)

- **Modo oscuro** sigue siendo el default.
- **Modo claro**: fondo orgánico con gradientes radiales + textura de ruido (en `ui-utils.js`).
- `.grupo-btn` en modo claro: regla CSS `body.light-mode .grupo-btn` con fondo violeta suave. **No usar `style.background` para el estado deseleccionado** — limpiar inline style (`b.style.background = ''`) y dejar que CSS lo maneje. El estado seleccionado sí usa inline style con el color del grupo (`GBGS` value).
- Se unificó el hover de cards de módulos para que respete el estilo de la selección de congregación.
- Botones flotantes de **Instalar** y **Admin** tienen variante de modo claro.

### Planificar salidas — cards compactas

Las cards de salida (`renderSalidaCard`) usan diseño compacto:
- Padding: `10px 14px` (antes `1rem 1.25rem`)
- Nombre del día: `14px font-weight:600` inline junto al tipo (`· Campo`), **no** el 22px anterior
- Labels de campo: `font-size:11px` (override local)
- `form-row` con `margin-bottom:6px`

### Formato de territorio en Firestore

```js
{
  id:        1,                        // número con offset para ciudades extra
  nombre:    "Territorio 1",           // display siempre sin offset
  tipo:      "normal" | "peligroso" | "no_predica",
  grupoId:   "3",                      // null si no asignado; siempre "C" para ciudades extra
  punto:     { lat, lng },
  poligonos: [{ coords: [{ lat, lng }, ...] }],
  ciudad:    null | "Ataliva Roca",    // null = ciudad principal
  notas:     null | "Edificio de dptos, timbre en entrada",  // opcional
}
```

---

## Módulo de Asignaciones

### Roles de reunión (tabla semanal)
`LECTOR`, `SONIDO_1`, `SONIDO_2`, `PLATAFORMA`, `MICROFONISTAS_1`, `MICROFONISTAS_2`,
`ACOMODADOR_AUDITORIO`, `ACOMODADOR_ENTRADA`, `PRESIDENTE`, `REVISTAS`, `PUBLICACIONES`

### Roles en lista de publicadores (Firestore)
Los publicadores se guardan con roles sin número: `SONIDO`, `MICROFONISTAS`.
El `ROL_LISTA_MAP` los mapea al cargar:
```js
const ROL_LISTA_MAP = {
  SONIDO:          'SONIDO_1',
  SONIDO_2:        'SONIDO_1',
  MICROFONISTAS:   'MICROFONISTAS_1',
  MICROFONISTAS_2: 'MICROFONISTAS_1',
};
```

### Roles extra (solo en lista de publicadores)
`CONDUCTOR_GRUPO_1..4`, `CONDUCTOR_CONGREGACION`

### Generar automático
- **`#auto-desde` / `#auto-hasta`**: rango. Pre-llenado: última fecha guardada + 1 semana → +3 meses.
- **"Tener en cuenta historial previo"**: busca el último asignado por rol y arranca desde el siguiente.
- **"Reemplazar semanas existentes"**: incluye fechas que ya tienen datos en el rango.
- **Algoritmo**: round-robin por rol; `SONIDO_2`/`MICROFONISTAS_2` con offset +1; `PRESIDENTE` omitido en miércoles; `Set enEstaReunion` detecta conflictos.
- **Semanas especiales**: ✅ implementado — respeta `tipoEspecial` al generar (`asamblea` → saltear ambas reuniones, `conmemoracion` entre semana → saltear miércoles, `superintendente` → generar martes en lugar de miércoles, sábado sin lector).

### Back buttons en vistas de encargado
Las vistas `view-editar`, `view-automatico`, `view-imagen` usan `onclick="goToEncargado()"` — **no** `showView('view-encargado')` directamente. `goToEncargado()` también llama `cargarEspeciales()`.

### Integración con Google Sheets (opcional)
- Botón "Guardar también en planilla" si `scriptUrl` está en Firestore
- Envía de a una reunión por fetch (`no-cors`, `keepalive: true`)
- Respuesta opaca — no se puede confirmar éxito, se asume OK
- **Pendiente mejorar:** agregar confirmación de éxito o mecanismo de retry

---

## Módulo Administrador (`hermanos/`)

Antes llamado "Hermanos". Renombrado a **"Administrador"** en UI, `index.html` raíz, y título de página.
El botón "Encargado" dentro fue renombrado a **"Lista de Hermanos"** (funcionalidad igual).

### Funcionalidades (desde el cover — requieren PIN)

El cover del módulo Administrador tiene **dos cards**:
1. **Lista de Hermanos** → `goToPin()` con `_pinTarget = 'hermanos'` → `view-main`
2. **Semanas especiales** → `goToPinEspeciales()` con `_pinTarget = 'especiales'` → `view-especiales`

**`view-main` — Lista de publicadores:**
- Filtro por rol + búsqueda por nombre
- Filtro especial `__sin_roles__` → muestra publicadores sin ningún rol asignado
- Rol `SUPERINTENDENTE_CIRCUITO` agregado (bajo optgroup Asignaciones)
- Botón "Ver planilla" al fondo si `sheetsUrl` está configurado en la congregación

**`view-especiales` — Semanas especiales:**
- CRUD de semanas especiales (`congregaciones/{id}/semanasEspeciales/{lunesISO}`)
- Tipos: `conmemoracion`, `superintendente`, `asamblea`
- El módulo de Asignaciones consume este dato al generar automático

### Chat / Notas (✅ implementado en Administrador)

FAB flotante igual al de Territorios, pero **solo canal Congregación** y autor siempre `"Administrador"`.
- `sessionStorage chatMisIdsAdmin` para tracking de autoría (separado del de Territorios)
- Funciones: `openChatPanel`, `closeChatPanel`, `sendChatNota`, `abrirEditNota`, `closeChatEdit`, `confirmarEditNota`, `eliminarNota`
- CSS en `hermanos/styles.css`

### Roles en publicadores

**Roles de asignaciones:** `LECTOR`, `SONIDO`, `SONIDO_2`, `MICROFONISTAS`, `MICROFONISTAS_2`,
`PLATAFORMA`, `ACOMODADOR_AUDITORIO`, `ACOMODADOR_ENTRADA`, `PRESIDENTE`, `REVISTAS`, `PUBLICACIONES`,
`CONDUCTOR_GRUPO_1..4`, `CONDUCTOR_CONGREGACION`, **`SUPERINTENDENTE_CIRCUITO`**

**Roles VM:** `VM_PRESIDENTE`, `VM_ORACION`, `VM_TESOROS`, `VM_JOYAS`, `VM_LECTURA`,
`VM_MINISTERIO_CONVERSACION`, `VM_MINISTERIO_REVISITA`, `VM_MINISTERIO_ESCENIFICACION`,
`VM_MINISTERIO_DISCURSO`, `VM_VIDA_CRISTIANA`, `VM_ESTUDIO_CONDUCTOR`

---

## Módulo de Vida y Ministerio

Módulo para el **presidente de la reunión VM**: importar programa de WOL, asignar partes,
gestionar publicadores por rol VM, sala auxiliar.

**Estado al 2026-03-31:** Fases 1, 2, sala auxiliar, historial Excel, semanas especiales (UI+generador),
PIN VM, navegación, vista mensual, editar títulos, duración visible, export/compartir, visor público,
menú Encargado centrado, filtros en vista Hermanos — todos ✅.
**Fase 4 auto-asignación:** ✅ implementada.

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

Solo hermanos: `VM_PRESIDENTE`, `VM_ORACION`, `VM_TESOROS`, `VM_JOYAS`, `VM_LECTURA`, `VM_VIDA_CRISTIANA`, `VM_ESTUDIO_CONDUCTOR`.
Hermanos y hermanas: `VM_MINISTERIO_*`.

### Importación WOL (✅)
URL: `https://wol.jw.org/es/wol/dt/r4/lp-s/{año}/{mes}/{día}` via Cloudflare Worker propio.
Parser usa `h3/h4` numerados — **no usar IDs `#pN`** (varían cada semana).
- Títulos en `h3/h4` con texto `"N. Título..."`. Tesoros: siempre los primeros 3 `h3` numerados.
- Frontera Ministerio/VC: `h3` con texto exactamente `"Canción N"`.
- Duración: primer `"(X mins.)"` después del `h3` correspondiente.

### Detección de tipo de parte ministerio

```js
function tipoMinisterioDesdeWOL(titulo) {
  const t = titulo.toLowerCase();
  if (t.includes('conversación'))  return 'conversacion';
  if (t.includes('revisita'))      return 'revisita';
  if (t.includes('escenificación') || t.includes('escenificacion')) return 'escenificacion';
  if (t.includes('discurso'))      return 'discurso'; // varón, sin ayudante
  return 'conversacion';
}
// tipo === 'discurso' → sin ayudante. Los demás → tienen ayudante.
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
| `calcularIndicesVM()` | Lee `semanasLista` (cache en memoria, asc) y calcula el índice inicial por rol según el último pubId asignado en el historial |
| `autoAsignarSemana(semana, indices)` | Loop principal. Modifica `semana` in-place, `indices` se actualiza in-place para generación masiva |
| `debeSkipAutoAsignar(fecha)` | Retorna `true` si la semana debe saltarse: `asamblea` siempre, `conmemoracion` solo si es entre semana |

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

#### Invariante anti-loop

El `while` del diseño original se reemplazó por `for (intentos < lista.length + 1)` — si todos
están en `enEstaSemana`, deja el slot en `null` y avanza el índice. Evita loop infinito con listas de 1 persona.

#### Índices: sin persistencia separada

Los índices **no se guardan en Firestore**. Se recalculan siempre desde `semanasLista` (historial en memoria).
Esto es correcto: en generación masiva, `indicesAA` se calcula una vez antes del loop y se pasa
mutable a cada llamada de `autoAsignarSemana`, acumulando el avance semana a semana.

#### Entrada al usuario

- **Botón "✦ Auto"** en `view-semana` → `autocompletarHermanos()` → pide confirmación (`uiConfirm purple`), luego `calcularIndicesVM()` + `autoAsignarSemana(semanaData, ...)` + `renderSemanaEdit()`. **No guarda automáticamente** — el encargado revisa y presiona "Guardar".
- **Checkbox `#nueva-auto-asignar`** en tab "Generar Semanas" → al generar N semanas, si está activo y la semana no debe saltarse, llama `autoAsignarSemana(semanaData, indicesAA)` antes del `setDoc`.

#### Para modificar en el futuro

- **Cambiar orden de prioridad de slots:** editar el orden en `construirSlotsOrdenados`.
- **Agregar regla de exclusión** (ej: una persona no puede ser presidente Y conductor en la misma semana): sumar la restricción dentro del `for (intentos...)` en `autoAsignarSemana` — el `enEstaSemana` Set ya maneja el caso más común.
- **Opción "no sobreescribir slots ya asignados":** en `autoAsignarSemana`, antes de asignar, chequear `getSlotPubIdFromSemana(semana, slot.key)` y saltear si no es null.
- **Persistir índices entre sesiones:** guardar `indicesAA` en `congregaciones/{id}` campo `vmIndicesRondas` y leerlo al init. Actualmente se recalcula desde historial (más robusto).

---

## ui-utils.js

| Función | Descripción |
|---------|-------------|
| `uiConfirm({ title, msg, confirmText, cancelText, type })` | Modal confirm. `type`: `warn`/`danger`/`info`/`purple` |
| `uiAlert(msg, title)` | Modal informativo |
| `uiDatePicker({ value, min, label })` | Picker de fecha |
| `uiTimePicker({ value, label })` | Picker de hora (teclado numérico) |
| `uiConductorPicker({ conductores, value, label, color })` | Selector con búsqueda |
| `uiTerritorioPicker({ territoriosData, allData, grupo, configData, label, color })` | Selector de territorio |
| `uiLoading.show(text)` / `uiLoading.hide()` | Overlay de carga |
| `uiToast(msg, type, duration)` | Toast. `type`: `success`/`error` |
| `upgradeInputs(container)` | Reemplaza inputs date/time/select por pickers custom. **Al setear `.value` programáticamente hay que disparar `dispatchEvent(new Event('change', { bubbles: true }))`** |

**Nunca usar `confirm()`, `alert()`, `prompt()` nativos.**

---

## Manzanas por territorio (pendiente — no implementado)

Sub-polígonos numerados dentro de cada territorio.

```
congregaciones/{congreId}/territorios/{terrId}/manzanas/{manzanaId}
  ├── numero: 1
  └── coords: [{lat, lng}, ...]
```

**Plan de implementación:**
1. **Importar de OSM** (Overpass API + `turf.polygonize()`) en `admin.html` — query por polígono del territorio, revisión visual antes de guardar.
2. **Editor manual** con Leaflet.Draw para corregir/dibujar desde cero.
3. **Visualización** en `mapa.html` al zoom ≥ 15, label con número, color diferenciado.

`territorios/app.js` y la estructura del doc de territorio no necesitan cambios — subcolección independiente.

---

## Convenciones de fechas

Siempre hora local — **nunca `toISOString()`** (bug UTC-3).

```js
// Global en ui-utils.js:
window.fmtDateLocal = function(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
// En módulos: usar fmtDateLocal() directamente (global) o: const fmtDate = fmtDateLocal;
```

Almacenamiento: `YYYY-MM-DD`. Display: `DD/MM/YY`.

---

## Estilos

> El sistema visual completo está en **[UI-STYLE.md](./UI-STYLE.md)**. Leerlo antes de tocar UI.

- Tema oscuro: `#1a1c1f` bg · `#e8e8e8` texto · `#232628` cards · `#252525` modales
- Max-width: apps `480px`, covers `320–340px`
- Fuente: `system-ui, sans-serif` — sin Google Fonts
- Vistas con clase `.view` tienen `fadeIn` 0.2s
- Versionado de assets: `styles.css?v=X.X` — incrementar al hacer cambios

---

## Ideas pendientes (futuro)

### Dashboard de estadísticas (más adelante)
- Territorios trabajados por mes/gráfico
- Publicadores más activos
- Tiempo promedio entre usos de territorio
- Asistencias y participaciones en reuniones

### Reportes PDF (más adelante)
- Informe mensual de territorios
- Historial completo de un territorio
- Resumen de asignaciones del mes

### Exportar historial a Excel/CSV (más adelante)
- Exportar todo el historial a Excel/CSV
- Backup completo de la congregación

### Widgets en pantalla principal (ANOTAR)
- Mostrar resumen rápido (próximas salidas, esta semana en reunión)
- Requiere que cada publicador pueda elegir ver su congregación

### Responsive mejorado (ANOTAR)
- Optimizar para tablets (actualmente mobile-first)

### Seguridad — en progreso
- ✅ Firebase Auth con Google + Anónimo
- ✅ Roles de usuario + mapa de permisos (`auth-config.js`)
- ✅ Matching automático con publicadores existentes
- ✅ Session header global
- ✅ Persistencia de congregación en localStorage
- ⬜ Guards activos en módulos (infraestructura lista, falta agregar `authGuard()` por módulo)
- ⬜ Reemplazar PINs internos por auth real (decisión pendiente)
- ⬜ Auditoría: log de cambios importantes (quién modificó qué y cuándo)
- ⬜ Resolución de matches ambiguos en `admin.html`

### Mejorar integración Google Sheets (Asignaciones)
- Fetch actual usa `no-cors` + `keepalive:true` → respuesta opaca, no se puede confirmar éxito
- Pendiente: agregar confirmación real o mecanismo de retry/estado

---

## Lo que NO hacer

- No eliminar la integración con Apps Script del módulo de asignaciones
- No hardcodear polígonos de territorios en HTML/JS
- No usar `toISOString()` para fechas (bug UTC-3)
- No commitear `tools/serviceAccountKey.json` ni archivos `.xlsx`
- No fetchear el KML de Google My Maps en runtime (CORS)
- No usar `confirm()`, `alert()`, `prompt()` nativos — usar `uiConfirm`, `uiAlert`, `uiToast`
- No setear `.value` en inputs upgradeados sin disparar el evento `change`
- **No usar IDs de párrafo WOL (`#p6`, `#p7`, etc.)** — varían cada semana
- No usar `style.background` para el estado **deseleccionado** de `.grupo-btn` — limpiar el inline style para que CSS del tema lo maneje
- No llamar `showView('view-encargado')` directamente en asignaciones — usar `goToEncargado()` (también recarga especiales)
- No llamar `window.signOutUser()` directamente desde UI — usar `window.sessionSignOut()` (limpia localStorage + sessionStorage + Firebase)
- No modificar permisos inline en el código — editar solo `auth-config.js` (`PERMISOS`)
- No hacer `initializeApp()` más de una vez — `firebase.js` ya lo hace; importar `{ db, auth }` desde ahí
