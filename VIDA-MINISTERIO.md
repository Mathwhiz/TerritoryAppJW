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

| Rol (interno) | Display | Quiénes pueden tener |
|---------------|---------|----------------------|
| `VM_PRESIDENTE` | Presidente RVM | Hermanos |
| `VM_ORACION` | Oración | Hermanos |
| `VM_TESOROS` | Discurso Tesoros | Hermanos |
| `VM_JOYAS` | Joyas Espirituales | Hermanos |
| `VM_LECTURA` | Lectura Bíblica | Hermanos (estudiantes) |
| `VM_MINISTERIO` | Partes Ministerio | Hermanos y hermanas |
| `VM_VIDA_CRISTIANA` | Vida Cristiana | Hermanos |
| `VM_ESTUDIO_CONDUCTOR` | Conductor Estudio | Hermanos |
| `VM_ESTUDIO_LECTOR` | Lector Estudio | Hermanos |

Para arrancar: se copia la lista de publicadores del módulo de Asignaciones y se
asignan roles VM a mano. Más adelante el módulo tendrá su propia gestión de hermanos.

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

## Algoritmo de auto-asignación

Igual que el módulo de Asignaciones: **round-robin por rol** con índice persistente.

```js
// Índices por rol (se calculan partiendo del último asignado en historial)
const indices = {
  VM_PRESIDENTE: 0,
  VM_ORACION:    0,
  VM_TESOROS:    0,
  // ...
};

// Por semana:
const enEstaSemana = new Set(); // detecta conflictos
for (const slot of slotsOrdenados) {
  const lista = publicadoresConRol(slot.rolRequerido);
  let i = indices[slot.rolRequerido];
  // Saltear si ya tiene parte esta semana
  while (enEstaSemana.has(lista[i % lista.length]?.id)) {
    i++;
  }
  slot.pubId = lista[i % lista.length]?.id;
  enEstaSemana.add(slot.pubId);
  indices[slot.rolRequerido] = (i + 1) % lista.length;
}
```

**Reglas especiales:**
- `VM_ORACION` apertura y cierre: distintas personas (offset +1)
- Presidente ≠ oración apertura ni cierre
- Conductor estudio ≠ lector estudio

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

### Fase 3 — Import historial Excel (próxima)
8. Script Python `tools/sync_vm_historial.py` que lea `Copia de Reunión Vida y Ministerio Cristiano.xlsx`
   y suba ~1 año de reuniones a `congregaciones/{congreId}/vidaministerio/`
   - Detectar columnas: fecha lunes, canciones, presidente, cada parte + asignado
   - Crear documentos con la misma estructura que crea el módulo manualmente
   - Idempotente: no sobreescribir si ya existe el doc para esa fecha

### Fase 4 — Auto-generación
9. Algoritmo round-robin para VM (igual que Asignaciones)
10. Vista Generar automático con rango de fechas
11. Gestión de roles VM en lista de publicadores

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
