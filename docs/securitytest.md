# Security Test

## Alcance de este primer análisis

Este documento resume el análisis práctico inicial del proyecto pensando en un atacante usando solo el navegador y DevTools (`F12`).

Importante:

- En este repo no apareció un archivo de reglas de Firestore (`firestore.rules`, `firebase.json`, `.firebaserc`).
- Por eso no fue posible auditar todavía las reglas reales del backend.
- Sí fue posible revisar el frontend, la estructura de datos usada por el cliente y varios riesgos concretos que existen si las reglas no están bien cerradas.

## Qué se analizó realmente

No fue solo el punto 1.

Se revisó:

- uso de Firestore desde el frontend
- lógica de autenticación y autorización en cliente
- campos sensibles escritos desde el navegador
- manejo de PINs y secretos en Firestore
- selección de congregación desde `sessionStorage`
- acciones manualmente ejecutables desde la consola

Lo que no se pudo confirmar todavía fue el comportamiento exacto de las Firestore Security Rules, porque ese archivo no está en el repo.

## Qué son las Firestore Security Rules

Las Firestore Security Rules son las reglas del backend de Firebase que deciden:

- quién puede leer documentos
- quién puede crear documentos
- quién puede modificar documentos
- quién puede borrar documentos
- qué campos se pueden cambiar
- si un usuario puede acceder solo a su propia congregación, su propio `uid`, etc.

Esas reglas no están en el frontend. Normalmente viven en archivos como:

- `firestore.rules`
- `firebase.json`
- `.firebaserc`

Y se despliegan a Firebase con la CLI.

Sin esas reglas, el frontend no protege nada por sí solo.

## Hallazgos actuales

### Vulnerabilidades críticas

#### 1. El “superadmin PIN” está en Firestore y se valida 100% en cliente

Referencias:

- `admin.js`
- `docs/arquitectura.md`

Código relevante:

- `admin.js` lee `config/superadmin.pin`
- luego compara el PIN en JavaScript del navegador

Explicación:

Si el navegador puede leer el PIN desde Firestore, entonces ese PIN ya no es un secreto real.

Cómo se explotaría desde F12:

```js
import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js').then(async ({doc,getDoc}) => {
  const { db } = await import('/shared/firebase.js');
  const snap = await getDoc(doc(db, 'config', 'superadmin'));
  console.log(snap.data());
});
```

Solución:

- no guardar ese PIN en Firestore accesible al cliente
- no usar PIN cliente como control real de acceso a `admin.html`
- proteger el panel con rol real y reglas reales

Ejemplo de regla:

```js
match /config/superadmin {
  allow read, write: if false;
}
```

#### 2. Los roles del usuario podrían modificarse desde el navegador si las rules no bloquean campos sensibles

Referencias:

- `shared/auth.js`
- `admin.js`

Explicación:

Existe `window.updateUserProfile(data)` que hace `updateDoc` sobre `usuarios/{uid}` sin whitelist de campos.

Si Firestore permite que el usuario escriba su propio documento, podría intentar cambiar:

- `appRoles`
- `appRol`
- `grupoEncargado`
- `matchEstado`
- `matchedPublisherId`
- `isAnonymous`
- `primerLogin`

Cómo se explotaría desde F12:

```js
await window.updateUserProfile({
  appRoles: ['admin_general'],
  appRol: 'admin_general',
  grupoEncargado: '1',
  matchEstado: 'ok'
});
```

Solución:

- permitir al usuario editar solo campos inocuos del perfil
- bloquear por rules todo campo de autorización o seguridad

Ejemplo de rules:

```js
match /usuarios/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;

  allow create: if request.auth != null && request.auth.uid == uid
    && request.resource.data.appRoles == ['publicador']
    && request.resource.data.appRol == 'publicador';

  allow update: if request.auth != null
    && request.auth.uid == uid
    && request.resource.data.diff(resource.data).changedKeys()
      .hasOnly(['displayName', 'sexo', 'birthDate', 'photoURL', 'primerLogin']);

  allow delete: if false;
}
```

#### 3. La congregación activa sale de `sessionStorage`, no del usuario autenticado

Referencias:

- `territorios/app.js`
- `hermanos/app.js`
- `asignaciones/app.js`

Explicación:

Los módulos usan `sessionStorage.congreId` para decidir qué ruta de Firestore leer y escribir.

Si las rules no verifican que el usuario pertenece a esa congregación, un atacante podría cambiar el valor en la consola y apuntar a otra congregación.

Cómo se explotaría desde F12:

```js
sessionStorage.setItem('congreId', 'otra-congregacion');
location.href = '/territorios/';
```

Solución:

- no confiar en `sessionStorage` para autorización
- validar en rules que el usuario pertenece a esa congregación

Patrón de rules:

```js
function isSameCongre(congreId) {
  return request.auth != null &&
    get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.congregacionId == congreId;
}
```

#### 4. Los PINs de módulos también están expuestos al cliente

Referencias:

- `hermanos/app.js`
- `asignaciones/app.js`
- `vida-ministerio/app.js`
- `docs/arquitectura.md`

Explicación:

`pinEncargado`, `pinVidaMinisterio` y `grupos.pin` se leen desde Firestore en el navegador.

Eso no sirve como mecanismo fuerte de seguridad frente a alguien con DevTools.

Cómo se explotaría:

- leyendo el doc de congregación o los docs de `grupos`
- inspeccionando las respuestas de Firestore
- ejecutando consultas desde consola

Solución:

- no usar PINs almacenados en Firestore cliente como control real de acceso
- reemplazarlos por roles reales o backend

### Riesgos importantes

#### 1. `anonimo` tiene acceso a casi todos los módulos

Referencias:

- `shared/auth-config.js`
- `shared/auth.js`

Explicación:

El rol `anonimo` hoy tiene acceso a varios módulos, y la protección posterior queda en PINs cliente.

Si las rules aceptan simplemente `request.auth != null`, una sesión anónima ya podría entrar.

Cómo se explotaría:

```js
await window.signInAnonymousUser();
location.href = '/hermanos/';
```

Solución:

- distinguir en rules usuario anónimo de usuario real
- no dar acceso sensible a cuentas anónimas

#### 2. El panel admin no está protegido por `authGuard('acceso_admin')`

Referencia:

- `admin.js`

Explicación:

`admin.js` importa auth, pero no exige rol admin real al entrar.

La protección está puesta en un PIN cargado desde Firestore en cliente.

Solución:

```js
import './shared/auth.js';
await window.authGuard('acceso_admin');
```

Y además rules reales del lado Firestore.

#### 3. Edición y borrado de chat dependen de estado local, no de ownership backend

Referencias:

- `territorios/app.js`
- `hermanos/app.js`

Explicación:

La UI decide si un mensaje es “mío” usando IDs guardados en `sessionStorage`, pero la operación real de editar o borrar usa solo el `docId`.

Si las rules no validan el dueño del mensaje, un atacante podría editar o borrar mensajes ajenos.

Cómo se explotaría:

```js
await window.eliminarNota('docIdDeOtro');
```

Solución:

- guardar `ownerUid` en cada mensaje
- en rules, permitir update/delete solo al dueño

Ejemplo:

```js
allow create: if request.auth != null
  && request.resource.data.ownerUid == request.auth.uid;

allow update, delete: if request.auth != null
  && resource.data.ownerUid == request.auth.uid;
```

#### 4. `scriptUrl` de Apps Script puede ejecutarse manualmente

Referencias:

- `asignaciones/app.js`
- `vida-ministerio/app.js`

Explicación:

Si un usuario puede leer `scriptUrl`, puede llamar el Apps Script manualmente sin pasar por la UI.

No se ve firma, token ni validación adicional en el cliente.

Solución:

- no exponer URLs operativas sensibles
- agregar autenticación o firma
- mover esa lógica a backend autenticado

## Cosas que están bien

- La `apiKey` pública de Firebase en `shared/firebase.js` no es un problema por sí sola.
- No se ve uso de Admin SDK en el frontend servido al navegador.
- Varias páginas sí usan `authGuard(...)`, aunque eso no reemplaza reglas reales.
- En chat de territorios se escapa HTML al renderizar, lo que ayuda contra XSS básico.

## Lo que falta para seguir

Para auditar de verdad el punto 1 y cerrar el análisis completo del backend, falta ver:

- `firestore.rules`
- `firebase.json`
- `.firebaserc`

Cuando eso esté, se puede revisar:

- si hay `allow read, write: if true`
- si `request.auth` está validado correctamente
- si el usuario queda limitado a su propio `uid`
- si puede acceder solo a su congregación
- si faltan reglas en subcolecciones
- si el cliente puede modificar campos sensibles

## Sobre Git

No parece buena idea meter este archivo en `.gitignore`.

Mejor dejarlo versionado porque:

- documenta hallazgos reales del proyecto
- sirve como checklist de endurecimiento
- permite trabajarlo punto por punto
- deja trazabilidad de lo que se corrigió

Solo convendría ignorarlo si fueras a poner secretos reales, exploits sensibles o credenciales. En su estado actual, es documentación técnica del proyecto.

## Progreso aplicado

### Endurecimiento transicional ya desplegado

Se aplicó una primera capa de seguridad sin romper el flujo actual de invitados + PIN.

Cambios realizados:

- se desplegaron `firestore.rules` transicionales al proyecto `appjw-3697e`
- `config/superadmin` ya no queda abierto a cualquier cliente
- `usuarios/{uid}` ya no permite auto-escalada simple de roles desde el navegador
- `admin.html` ahora exige:
  1. login con Google
  2. que el usuario tenga permiso real de admin
  3. luego recién el PIN

Objetivo de esta etapa:

- no romper módulos actuales
- no romper invitados
- empezar a cerrar ataques muy obvios

### Hallazgo operativo importante

El sistema de permisos del frontend espera que `appRoles` sea un array.

Formato correcto:

```js
appRol: "admin_general",
appRoles: ["admin_general"]
```

Formato incorrecto que causó fallas:

```js
appRol: "admin_general",
appRoles: "admin_general"
```

Síntoma observado:

- en `admin.html` quedaba “Verificando acceso…”
- DevTools mostraba:

```txt
TypeError: roles.some is not a function
```

Se corrigió el frontend para tolerar valores legacy o mal tipados en `appRoles`, pero igual conviene normalizar los datos en Firestore.

### Próximos pasos recomendados sin romper flujo

- normalizar todos los documentos de `usuarios` para que `appRoles` siempre sea array
- mejorar mensajes de error del panel admin cuando un usuario está logueado pero mal configurado
- completar endurecimiento de chat con `ownerUid`
- más adelante separar secretos del doc `congregaciones/{congreId}`

### Endurecimiento chico adicional aplicado

Se aplicaron tres mejoras de bajo riesgo y sin cambiar el flujo principal:

1. `updateUserProfile()` ahora filtra campos permitidos en frontend

- solo deja pasar:
  - `displayName`
  - `photoURL`
  - `birthDate`
  - `sexo`
  - `primerLogin`
- evita abuso casual desde DevTools mandando campos arbitrarios

2. `predicacion` ahora usa `authGuard('acceso_predicacion')`

- alinea el módulo con el resto de la app
- evita que un usuario sin permiso entre solo por UI

3. `firestore.rules` valida mejor updates administrativos de roles

- cuando un admin cambia roles, `appRoles` debe seguir siendo array
- `appRol` debe coincidir con el primer valor de `appRoles`
- reduce errores de datos y estados inconsistentes

### Cambio aplicado sobre invitados anónimos

Se decidió dejar de crear automáticamente documentos `usuarios/{uid}` para sesiones anónimas.

Motivo:

- los invitados no estaban aportando valor real en Firestore
- solo llenaban la colección `usuarios` con registros descartables
- el flujo visible de la app no depende de que exista ese doc

Cómo queda ahora:

- la sesión anónima sigue existiendo en Firebase Auth
- el frontend sigue viendo al usuario como invitado
- si luego el invitado se vincula con Google, recién ahí se crea/actualiza el documento en `usuarios/{uid}`

Riesgo / nota:

- los invitados viejos ya existentes en Firestore quedan como basura histórica hasta que se limpien
- si en el futuro alguna rule dependiera de docs anónimos persistidos, habría que revisarlo

### Error visto en DevTools

```txt
POST https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?...TYPE=terminate...
net::ERR_BLOCKED_BY_CLIENT
```

Interpretación más probable:

- el navegador o una extensión bloqueó esa request
- suele pasar con adblockers, Brave Shields, bloqueadores de tracking o filtros de privacidad

Contexto:

- Firestore abre conexiones de escucha (`Listen/channel`) para realtime
- cuando cierra o recicla una conexión, puede mandar una request `TYPE=terminate`
- si una extensión la bloquea, suele aparecer este error en consola aunque la app siga funcionando

Conclusión práctica:

- normalmente **no indica un bug de tu app**
- normalmente **no indica un problema de rules**
- si todo sigue funcionando, suele ser ruido de cliente/extensiones

Cuándo preocuparse:

- si además fallan lecturas en tiempo real
- si snapshots/listeners dejan de actualizar
- si ocurre igual en incógnito sin extensiones

### Estado actual del mapa público

Se avanzó con una versión pública de mapa accesible desde:

```txt
/territorios/mapa.html?congre=<id>&modo=public
```

Objetivo de este modo:

- permitir ver el mapa completo sin entrar al módulo privado
- no mostrar historial de territorios
- no mostrar "último uso"
- no mostrar "hace cuántos días"
- no mostrar `notas`

Cambios aplicados:

- se agregó un espejo público de datos de mapa dentro de cada congregación:
  - `mapa_config/publico`
  - `mapa_grupos`
  - `mapa_territorios`
- `admin.js` sincroniza ese espejo público
- `territorios/mapa.html` en `modo=public` ya lee ese espejo
- se agregó una tarjeta `Ver mapa` al selector principal

### Hallazgo importante durante pruebas del mapa

El grupo 4 mostraba zoom incorrecto aunque la geometría visible parecía normal.

Se detectó:

- un bug en el espejo público donde `mapa_territorios` podía escribirse usando a veces el `id` lógico y otras veces el `docId` de Firestore
- eso podía dejar datos inconsistentes o duplicados en el espejo

Se corrigió:

- ahora el espejo público escribe territorios usando siempre `String(terr.id)`
- si detecta IDs públicos inesperados, reconstruye el espejo completo

### Ajuste de viewport / zoom

Durante las pruebas del mapa se detectó que confiar en `polygon.getBounds()` no era estable para algunos territorios.

Se cambió la estrategia:

- el viewport del mapa pasa a calcular bounds desde las coordenadas reales (`coords`)
- no depende del `getBounds()` del layer de Leaflet para encuadrar grupos o ciudad principal

Beneficio:

- mejor zoom inicial
- mejor zoom al filtrar grupos
- evita bugs raros de encuadre como el observado con el grupo 4

Nota:

- este ajuste impacta positivamente tanto en el mapa público como en buena parte del mapa interno, porque comparten `territorios/mapa.html`

### Espejo público para Vida y Ministerio

Se preparó un espejo público específico para el visor de VM, para no depender de:

- `congregaciones/{congreId}` completo
- `publicadores` reales completos
- `vidaministerio` privado

Estructura creada:

- `congregaciones/{congreId}/vm_config/publico`
- `congregaciones/{congreId}/vm_publicadores/{id}`
- `congregaciones/{congreId}/vm_programa/{fecha}`
- `congregaciones/{congreId}/vm_especiales/{fecha}`

Objetivo:

- que `vida-ministerio/programa.html` pueda funcionar con datos públicos mínimos
- evitar exponer PINs, `scriptUrl` y otros campos privados del doc principal de congregación

Estado:

- `vida-ministerio/app.js` ya sincroniza ese espejo
- `vida-ministerio/programa.js` ya fue adaptado para leer el espejo público
- `vida-ministerio/programa.js` ya no importa `shared/auth.js`, para no depender de auth en el visor

Importante:

- esto todavía **no mejora la seguridad real por sí solo** mientras `congregaciones/{congreId}` y sus subcolecciones sigan con `allow read, write: if true`
- el valor de este paso es dejar separada la data pública para que después sí podamos cerrar rules sin romper el visor

### Espejo público para Asignaciones

Se preparó también un visor público separado para Asignaciones.

Archivos nuevos:

- `asignaciones/programa.html`
- `asignaciones/programa.js`

Estructura pública creada:

- `congregaciones/{congreId}/asig_config/publico`
- `congregaciones/{congreId}/asig_programa/{fecha}`
- `congregaciones/{congreId}/asig_especiales/{lunes}`

Objetivo:

- mostrar la semana actual y navegar semanas sin cargar PIN, `scriptUrl`, `sheetsUrl` ni lógica de encargado
- separar la vista pública del módulo grande `asignaciones/app.js`

Estado:

- `asignaciones/app.js` ya sincroniza el espejo `asig_*`
- `asignaciones/programa.js` ya lee solo el espejo público
- igual que en VM, esto prepara el cierre futuro pero todavía no da seguridad real mientras `congregaciones/**` siga abierto en rules
