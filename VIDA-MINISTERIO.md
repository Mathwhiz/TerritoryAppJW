# Módulo Vida y Ministerio — Plan de Implementación

App para que el **presidente de la reunión Vida y Ministerio Cristiano** prepare y asigne
el programa semanal de forma automática, con edición rápida.

---

## Estructura del programa semanal

Cada semana (lunes) tiene partes fijas + partes variables importadas de WOL:

```
Canción de apertura + Oración apertura
│
├── SECCIÓN 1: TESOROS DE LA PALABRA DE DIOS
│   ├── Discurso (10 min)                ← hermano
│   ├── Joyas Espirituales (10 min)      ← hermano
│   └── Lectura Bíblica (N min)          ← hermano estudiante (+ lector?)
│
├── Canción intermedia
│
├── SECCIÓN 2: SEAMOS MEJORES MAESTROS
│   ├── Parte 1 (N min)                  ← hermano/hermana (+ ayudante?)
│   ├── Parte 2 (N min)                  ← hermano/hermana (+ ayudante?)
│   └── Parte 3 (N min, opcional)        ← hermano/hermana (+ ayudante?)
│
├── SECCIÓN 3: NUESTRA VIDA CRISTIANA
│   ├── Parte 1 (N min)                  ← hermano
│   ├── Parte 2 (N min, opcional)        ← hermano
│   └── Estudio Bíblico Congregacional   ← conductor + lector
│
└── Canción de cierre + Oración cierre
```

Roles con **ayudante**: Lectura Bíblica, partes de Sección 2 (demostraciones), posiblemente Sección 3.
Solo hermanos pueden presidir, dar Tesoros, Vida Cristiana y conducir Estudio.
Hermanos y hermanas pueden dar partes de Sección 2.

---

## Arquitectura Firestore

```
congregaciones/{congreId}/
  └── vidaministerio/{semanaId}   ← semanaId = fecha del lunes "YYYY-MM-DD"
```

### Documento de semana

```js
{
  fecha: "2026-03-23",             // lunes de la semana
  cancionApertura:   123,
  cancionIntermedia: 456,
  cancionCierre:     789,

  presidente:    "pubId",          // quien preside
  oracionApertura: "pubId",
  oracionCierre:   "pubId",

  tesoros: {
    discurso:      { titulo: "...", duracion: 10, pubId: null },
    joyas:         { titulo: "Joyas Espirituales", duracion: 10, pubId: null },
    lecturaBiblica:{ titulo: "Lea Hechos 7:1-16 (N min.)", duracion: 4, pubId: null, ayudante: null }
  },

  ministerio: [                    // array variable (2-4 partes)
    { titulo: "...", tipo: "video"|"discurso"|"demostracion", duracion: N, pubId: null, ayudante: null },
    ...
  ],

  vidaCristiana: [                 // array variable (1-3 partes + estudio)
    { titulo: "...", tipo: "parte"|"estudio_biblico", duracion: N, pubId: null, ayudante: null },
    ...
  ],

  // Metadata de importación
  importadoDeWOL: true,
  creadoEn: timestamp
}
```

### Campo nuevo en doc de congregación

```js
pinVidaMinisterio: "1234"    // PIN del presidente/encargado de este módulo
```

Se agrega también en `admin.html` (editar congregación) y en `admin.js`.

---

## Roles de publicadores (nuevos — se agregan a publicadores existentes)

Los publicadores ya existen en `congregaciones/{congreId}/publicadores`.
Se agregan nuevos roles a la lista de cada uno:

| Rol (interno) | Display | Quiénes |
|---------------|---------|---------|
| `VM_PRESIDENTE` | Presidente RVM | Hermanos |
| `VM_ORACION` | Oración (apertura/cierre) | Hermanos |
| `VM_TESOROS` | Discurso Tesoros | Hermanos |
| `VM_JOYAS` | Joyas Espirituales | Hermanos |
| `VM_LECTURA` | Lectura Bíblica | Hermanos (varones) |
| `VM_MINISTERIO_CONVERSACION` | Conversación (1a/2a) | Hermanos y hermanas |
| `VM_MINISTERIO_REVISITA` | Revisita | Hermanos y hermanas |
| `VM_MINISTERIO_ESCENIFICACION` | Escenificación | Hermanos y hermanas |
| `VM_MINISTERIO_DISCURSO` | Discurso SMM | Hermanos (varones, ~5 min) |
| `VM_VIDA_CRISTIANA` | Discurso Vida Cristiana | Hermanos |
| `VM_ESTUDIO_CONDUCTOR` | Conductor Estudio | Hermanos |

> **Nota:** El lector del estudio bíblico ya está en el módulo de Asignaciones — no se duplica aquí.

Los roles VM se agregan al array `roles` de los mismos publicadores de `congregaciones/{congreId}/publicadores`.
La gestión de roles VM se hace desde la vista "Hermanos" del módulo VM (muestra solo roles VM, mismos IDs de persona).

---

## Importación del programa desde WOL

WOL (Watchtower Online Library) publica cada semana en:
```
https://wol.jw.org/es/wol/dt/r4/lp-s/{año}/{mes}/{día}
```
Donde `{día}` es el lunes de la semana (o cualquier día de esa semana — WOL muestra la semana completa).

### Estrategia — Cloudflare Worker propio (✅ implementado)

wol.jw.org bloquea proxies públicos conocidos. Se usa un Worker propio:

```
https://super-math-a40f.mnsmys12.workers.dev/?url=<encoded-wol-url>
```

Con fallbacks a `codetabs.com` y `allorigins.win` (pueden estar bloqueados).
El Worker hace el fetch server-to-server y devuelve el HTML con `Access-Control-Allow-Origin: *`.

### Parser real (✅ implementado — los IDs `#pN` son inútiles)

**Estructura actual de WOL**: los títulos de cada parte están en `h3`/`h4` con texto `"N. Título..."`.
Los IDs `#p6`, `#p7`, etc. apuntan a párrafos de cuerpo (duración o body), no a los títulos.
Los IDs varían cada semana según la cantidad de párrafos de cada parte.

```js
// Partes numeradas: h3/h4 con texto "N. Título..."
const allH3   = Array.from(root.querySelectorAll('h3, h4'));
const numbered = allH3.filter(h => /^\d+\.\s/.test(h.textContent.trim()));

// Frontera Ministerio / Vida Cristiana:
// h3 con texto exactamente "Canción N" (sin "y oración") = canción intermedia
const midSongH3 = allH3.find(h => /^Canción\s+\d+$/.test(h.textContent.trim()));

// Tesoros: siempre los primeros 3 h3 numerados (discurso, joyas, lectura)
// Ministerio: numerados antes del midSong
// Vida Cristiana: numerados después del midSong (último = estudio bíblico)

// Duración: primer elemento con "(X mins.)" entre un h3 y el siguiente
// NO filtrar por hojas — párrafos de ministerio tienen <a> adentro
```

### Canciones — parsing desde h3

```js
// Apertura:    h3 con "Canción N y oración | Palabras de introducción"
// Intermedia:  h3 con texto exactamente "Canción N"
// Cierre:      h3 con "Palabras de conclusión | Canción N"
const songNum = h => h.textContent.match(/Canción\s+(\d+)/)?.[1] || '';
```

---

## Detección automática de tipo de parte (para auto-asignación)

El título importado de WOL se analiza para determinar qué rol se necesita.

### Seamos Mejores Maestros — mapeo título → rol

```js
function tipoMinisterioDesdeWOL(titulo) {
  const t = titulo.toLowerCase();
  if (t.includes('conversación'))  return 'conversacion';
  if (t.includes('revisita'))      return 'revisita';
  if (t.includes('escenificación') || t.includes('escenificacion')) return 'escenificacion';
  if (t.includes('discurso'))      return 'discurso'; // varón, sin ayudante
  return 'conversacion'; // fallback
}

const TIPO_ROL_MAP = {
  conversacion:  'VM_MINISTERIO_CONVERSACION',
  revisita:      'VM_MINISTERIO_REVISITA',
  escenificacion:'VM_MINISTERIO_ESCENIFICACION',
  discurso:      'VM_MINISTERIO_DISCURSO',  // varones, sin ayudante
};
```

**Regla de ayudante:**
- `tipo === 'discurso'` → sin ayudante (es un varón solo)
- Todos los demás tipos → tienen ayudante (orador + ayudante, pueden ser h/h)

El campo `tipo` se guarda en Firestore al importar de WOL para que el auto-asignador lo use.
Si la semana fue creada manualmente sin WOL, el encargado puede editar el tipo de cada parte.

---

## Algoritmo de auto-asignación

Igual que el módulo de Asignaciones: **round-robin por rol** con índice persistente.

```js
// Índices por rol
const indices = {
  VM_PRESIDENTE: 0, VM_ORACION: 0, VM_TESOROS: 0, VM_JOYAS: 0,
  VM_LECTURA: 0, VM_MINISTERIO_CONVERSACION: 0, VM_MINISTERIO_REVISITA: 0,
  VM_MINISTERIO_ESCENIFICACION: 0, VM_MINISTERIO_DISCURSO: 0,
  VM_VIDA_CRISTIANA: 0, VM_ESTUDIO_CONDUCTOR: 0,
};

// Por semana:
const enEstaSemana = new Set();
for (const slot of slotsOrdenados) {
  const rol = slot.rolRequerido;
  const lista = publicadoresConRol(rol);
  let i = indices[rol];
  while (enEstaSemana.has(lista[i % lista.length]?.id)) i++;
  slot.pubId = lista[i % lista.length]?.id;
  enEstaSemana.add(slot.pubId);
  indices[rol] = (i + 1) % lista.length;
}
```

**Reglas especiales:**
- `VM_ORACION` apertura y cierre: distintas personas (índice +1 para el segundo)
- Presidente ≠ oración apertura ni cierre
- Conductor estudio ≠ lector (lector viene de Asignaciones, no se asigna aquí)
- Tipo `discurso` en Ministerio: sin ayudante, solo varones (`VM_MINISTERIO_DISCURSO`)

---

## Vistas del módulo

### Vista 1 — Lista de semanas
- Grid de semanas (próximas + historial)
- Card por semana: fecha, estado (✓ completa / ⚠ incompleta / vacía)
- Botón "+ Nueva semana" → import WOL o entrada manual
- Botón "Generar automático" para rango de fechas

### Vista 2 — Programa de la semana
- Encabezado: fecha, canciones
- Las 3 secciones con todos los slots
- Por cada slot: título de la parte + botón asignar publicador
- Indicador visual si slot vacío (rojo) o asignado (nombre del hermano)
- Botón guardar + botón editar canciones

### Vista 3 — Generar automático
- Picker rango de fechas
- Checkbox "Importar programa de WOL automáticamente"
- Checkbox "Tener en cuenta historial previo"
- Checkbox "Reemplazar semanas existentes"
- Botón Generar

### Vista 4 — Gestionar hermanos (VM)
- Lista de publicadores con roles VM
- Filtro por rol VM
- Editar roles de cada uno

---

## Estructura de archivos

```
vida-ministerio/
  ├── index.html      # App (misma estructura que los otros módulos)
  ├── app.js          # Lógica principal
  └── styles.css
```

Se agrega la card "Vida y Ministerio" en `index.html` (selector de módulo) con:
- Color acento: `#EF9F27` (naranja) o uno nuevo de la paleta
- Ícono: libro/podio

---

## PIN y acceso

| Actor | PIN | Puede |
|-------|-----|-------|
| Presidente | `pinVidaMinisterio` (default `"1234"`) | Ver, editar, asignar, generar |
| Visitante | — | (futuro: modo solo lectura del programa) |

El PIN se agrega al doc de congregación y se configura desde `admin.html`.

---

## Fases de implementación

### ✅ Fase 1 — MVP (completo)
1. Estructura Firestore + PIN en admin
2. Cover de módulo + card en index.html
3. Vista lista de semanas
4. Vista programa de semana (entrada manual de partes + asignación de publicadores)

### ✅ Fase 2 — Importación WOL (completo)
5. Parser WOL via Cloudflare Worker + DOMParser
6. Botón "Importar de WOL" en crear semana + reimportar
7. Extrae títulos, duraciones y números de canciones

### Fase 3 — Import historial Excel (pendiente)
8. Script Python `tools/sync_vm_historial.py` que lea `Copia de Reunión Vida y Ministerio Cristiano.xlsx`
   y suba ~1 año de reuniones a `congregaciones/{congreId}/vidaministerio/`
   - Detectar columnas: fecha lunes, canciones, presidente, cada parte + asignado
   - Crear documentos con la misma estructura que crea el módulo manualmente
   - Idempotente: no sobreescribir si ya existe el doc para esa fecha

### Fase 4 — Auto-asignación VM (próxima)

**Roles VM** — se agregan a `publicadores.roles[]` (mismos docs que Asignaciones):
`VM_PRESIDENTE`, `VM_ORACION`, `VM_TESOROS`, `VM_JOYAS`, `VM_LECTURA`,
`VM_MINISTERIO_CONVERSACION`, `VM_MINISTERIO_REVISITA`, `VM_MINISTERIO_ESCENIFICACION`,
`VM_MINISTERIO_DISCURSO`, `VM_VIDA_CRISTIANA`, `VM_ESTUDIO_CONDUCTOR`

**Pasos de implementación:**

9. **Guardar `tipo` al importar WOL** — `tipoMinisterioDesdeWOL(titulo)` en el parser → campo `tipo` en cada parte de `ministerio[]`
10. **Gestión de hermanos VM** — nueva vista en el módulo (botón en cover/encargado):
    - Lista publicadores con filtro por rol VM
    - Toggle por rol VM (igual UI que Asignaciones)
    - Muestra solo roles VM, mismos pubId
11. **Vista "Generar automático"** — igual que Asignaciones:
    - Picker rango de fechas (desde / hasta)
    - Checkbox "Tener en cuenta historial previo"
    - Checkbox "Reemplazar semanas existentes"
    - Botón Generar → crea/actualiza docs en `vidaministerio/`
    - Por cada semana: importa WOL automáticamente si no existe, luego asigna publicadores
12. **Algoritmo round-robin** — ver sección "Algoritmo de auto-asignación" arriba
    - Si la semana tiene una `semanasEspeciales` de tipo `asamblea` → saltar
    - Si es `superintendente` → `tesoros.lecturaBiblica` asignar igual, pero `vidaCristiana[last]` = discurso del superintendente (sin asignar pubId)

**Sala auxiliar (si aplica):**
- `tesoros.lecturaBiblica` tiene `ayudanteAux` además de `ayudante`
- Partes de ministerio tipo demo tienen `ayudanteAux`
- En auto-asignación: el `ayudante` del salón principal es siguiente en la lista, `ayudanteAux` es el siguiente después de ese

### Fase 5 — Polish
12. Estado de completitud por semana (✓ / ⚠ / vacía) — ya parcialmente hecho en lista
13. Compartir programa (imagen/PDF)
14. `pinVidaMinisterio` configurable desde `admin.html`

---

## Lo que NO hacer

- No hardcodear el programa de ninguna congregación
- **No usar IDs de párrafo WOL (`#p6`, `#p7`, etc.)** — varían cada semana según el contenido. Usar `h3/h4` numerados.
- No mezclar roles VM con roles de Asignaciones en la misma lista
- No usar `confirm()`, `alert()`, `prompt()` nativos
- No usar `toISOString()` para fechas
