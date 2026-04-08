## Módulo Administrador (`hermanos/`)

Antes llamado "Hermanos". Renombrado a **"Administrador"** en UI, `index.html` raíz, y título de página.
El botón "Encargado" dentro fue renombrado a **"Lista de Hermanos"** (funcionalidad igual).

### Funcionalidades (desde el cover - requieren PIN)

El cover del módulo Administrador tiene **tres cards**:
1. **Lista de Hermanos** -> `goToPin()` con `_pinTarget = 'hermanos'` -> `view-main`
2. **Grupos** -> `view-grupos`
3. **Semanas especiales** -> `goToPinEspeciales()` con `_pinTarget = 'especiales'` -> `view-especiales`

**`view-main` - Lista de publicadores:**
- Filtro por rol + búsqueda por nombre
- Filtro especial `__sin_roles__` -> muestra publicadores sin ningún rol asignado
- Rol `SUPERINTENDENTE_CIRCUITO` agregado (bajo optgroup Asignaciones)
- Botón "Ver planilla" al fondo si `sheetsUrl` está configurado en la congregación

**`view-grupos` - Organización por grupos:**
- Muestra la congregación separada por `grupoId` y una columna "Sin grupo"
- Permite agregar, mover y quitar publicadores de un grupo
- La pertenencia se guarda en `congregaciones/{id}/publicadores/{pubId}.grupoId`
- Un publicador no puede quedar en dos grupos a la vez porque solo existe un `grupoId` por documento

**`view-especiales` - Semanas especiales:**
- CRUD de semanas especiales (`congregaciones/{id}/semanasEspeciales/{lunesISO}`)
- Tipos: `conmemoracion`, `superintendente`, `asamblea`
- El módulo de Asignaciones consume este dato al generar automático

### Chat / Notas (implementado en Administrador)

FAB flotante igual al de Territorios, pero **solo canal Congregación** y autor siempre `"Administrador"`.
- `sessionStorage chatMisIdsAdmin` para tracking de autoría (separado del de Territorios)
- Funciones: `openChatPanel`, `closeChatPanel`, `sendChatNota`, `abrirEditNota`, `closeChatEdit`, `confirmarEditNota`, `eliminarNota`
- CSS en `hermanos/styles.css`

### Roles en publicadores

### Datos extra en publicadores

- `grupoId` -> grupo pastoral actual del publicador
- Puede cargarse por importación o editarse manualmente desde `view-grupos`

**Roles de asignaciones:** `LECTOR`, `SONIDO`, `SONIDO_2`, `MICROFONISTAS`, `MICROFONISTAS_2`,
`PLATAFORMA`, `ACOMODADOR_AUDITORIO`, `ACOMODADOR_ENTRADA`, `PRESIDENTE`, `REVISTAS`, `PUBLICACIONES`,
`CONDUCTOR_GRUPO_1..4`, `CONDUCTOR_CONGREGACION`, **`SUPERINTENDENTE_CIRCUITO`**

**Roles VM:** `VM_PRESIDENTE`, `VM_ORACION`, `VM_TESOROS`, `VM_JOYAS`, `VM_LECTURA`,
`VM_MINISTERIO_CONVERSACION`, `VM_MINISTERIO_REVISITA`, `VM_MINISTERIO_ESCENIFICACION`,
`VM_MINISTERIO_DISCURSO`, `VM_VIDA_CRISTIANA`, `VM_ESTUDIO_CONDUCTOR`
