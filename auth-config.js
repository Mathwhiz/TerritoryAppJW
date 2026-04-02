// auth-config.js — Roles y permisos de la app
// Para cambiar qué puede hacer un rol: editar PERMISOS.
// Para agregar una feature nueva: agregar la key aquí y llamar
// hasPermission('nueva_feature') donde se necesite.

export const APP_ROLES = {
  ADMIN_GENERAL:          'admin_general',
  ADMIN_CONGRE:           'admin_congre',
  ENCARGADO_ASIGNACIONES: 'encargado_asignaciones',
  ENCARGADO_VM:           'encargado_vm',
  ENCARGADO_GRUPO:        'encargado_grupo',
  ANCIANO:                'anciano',
  SIERVO_MINISTERIAL:     'siervo_ministerial',
  PRECURSOR_REGULAR:      'precursor_regular',
  PRECURSOR_AUXILIAR:     'precursor_auxiliar',
  PUBLICADOR:             'publicador',
  PENDIENTE:              'pendiente',  // sin match confirmado — acceso bloqueado
};

// ─────────────────────────────────────────────────────────────────
// PERMISOS
// Cada key es una feature que se puede verificar con hasPermission().
// Agregar un rol nuevo: copiarlo con el array de features que le corresponda.
// ─────────────────────────────────────────────────────────────────
export const PERMISOS = {

  admin_general: [
    'acceso_admin',
    'acceso_territorios',
    'acceso_asignaciones',
    'acceso_vm',
    'acceso_hermanos',
    'editar_publicadores',
    'editar_congregacion',
    'ver_todas_congregaciones',
    'gestionar_usuarios',
  ],

  admin_congre: [
    'acceso_territorios',
    'acceso_asignaciones',
    'acceso_vm',
    'acceso_hermanos',
    'editar_publicadores',
    'gestionar_usuarios',
  ],

  encargado_asignaciones: [
    'acceso_asignaciones',
    'acceso_hermanos',
  ],

  encargado_vm: [
    'acceso_vm',
    'acceso_hermanos',
  ],

  encargado_grupo: [
    'acceso_territorios',
  ],

  anciano: [
    'acceso_territorios',
    'acceso_vm',
  ],

  siervo_ministerial: [
    'acceso_territorios',
  ],

  precursor_regular: [
    'acceso_territorios',
  ],

  precursor_auxiliar: [
    'acceso_territorios',
  ],

  publicador: [
    'acceso_territorios',
  ],

  pendiente: [
    // Sin acceso hasta que el admin confirme el match
  ],

};
