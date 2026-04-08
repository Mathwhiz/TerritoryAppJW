## Panel de Admin (`admin.html`)

Acceso: URL directa → login Google con rol admin + PIN (desde `config/superadmin → { pin }` en Firestore).

### Endurecimiento actual

- Los PINs nuevos de módulo se guardan en `congregaciones/{congreId}/config_privada/modulos`
- El frontend mantiene fallback al esquema viejo para no romper congregaciones existentes
- El doc principal de congregación se deja para datos no sensibles y espejos públicos

**Funcionalidades:**
- Listar congregaciones existentes
- **Crear congregación** (wizard 3 pasos):
  1. Nombre + ID slug + PIN encargado + PIN VM + **color** (random de paleta, editable) + ciudad principal
  2. Configurar grupos: label, color, PIN
  3. KML ciudad principal (opcional) + **ciudades extra** (nombre + KML c/u, IDs con offset automático)
- **Editar** congregación (mismos campos)
- **Eliminar** congregación (borra todas las subcolecciones)
- **Asignar territorios a grupos** (📍): lista con filtros, batch update
- **Resolver matches ambiguos** (`view-matches`): usuarios con `matchEstado: 'pendiente'` — muestra candidatos con nombre y roles, permite seleccionar el publicador correcto o marcar "No encontrado". Al resolver: actualiza `matchedPublisherId`, `matchEstado: 'ok'|'sin_match'`, `appRol: 'publicador'`. El dashboard muestra un banner amarillo con el contador de pendientes.
- **Gestionar usuarios** (👥 → `view-usuarios`): lista los usuarios registrados de esa congregación (excluye anónimos), ordenados alfabéticamente. Muestra nombre, email, badge de estado de match y dropdown de rol. Ver detalle abajo.

### `view-usuarios` — Gestión de usuarios por congregación

Acceso: botón 👥 en la tarjeta de cada congregación en el dashboard.

**Columnas / campos por usuario:**
- Avatar con iniciales
- Nombre (`displayName`) + email
- Badge de match: `✓ Vinculado` (`ok`) · `⚠ Ambiguo` (`pendiente`) · `Sin match` (`sin_match`)
- Dropdown de rol → guarda al instante con toast de confirmación. No disponible rol `admin_general` ni `anonimo`.

**Botón 🔗 Vincular** — aparece en filas con `matchEstado !== 'ok'`:
- Abre un bottom sheet con la lista de publicadores activos de la congregación
- Buscador en tiempo real (normalizado, sin tildes)
- Al confirmar: actualiza `matchedPublisherId` + `matchEstado: 'ok'`. **No cambia `appRol`** (el rol se gestiona por separado con el dropdown).
- Tras confirmar: recarga la lista de usuarios.

**Constantes en `admin.js`:**
- `ROL_LABELS` — mapa rol → etiqueta legible en español
- `ROLES_ASIGNABLES` — roles disponibles en el dropdown (excluye `admin_general` y `anonimo`)

**Estado interno del modal vincular:**
- `_usuariosCongreId` / `_usuariosCongreNombre` — guardados al abrir la vista, usados para refrescar tras vincular
- `_vincPubs`, `_vincUid`, `_vincNombre` — estado temporal del modal abierto

**Paleta de colores** (`PALETA_COLORES`):
`#378ADD`, `#97C459`, `#7F77DD`, `#EF9F27`, `#1D9E75`, `#D85A30`

**KML parser** (`parseKML`):
- Soporta `"1"`, `"92a"`, `"Territorio 1"`, `"Territorio 1a"`
- Para ciudades extra: `id = parsedNum + offset` (ej: territorio 1 de ciudad extra 1 → ID 1001)
- El campo `ciudad` se setea al momento de guardar (no al parsear el KML)
