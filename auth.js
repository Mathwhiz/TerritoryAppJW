// auth.js — Autenticación y perfiles de usuario
// Importar en cada página con: import './auth.js' (o '../auth.js' desde módulos)
// Expone en window: waitForAuth, currentUser, hasPermission, authGuard,
//                   signInWithGoogle, signOutUser, updateUserProfile

import { db, auth } from './firebase.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { PERMISOS } from './auth-config.js';

// ── Estado interno ────────────────────────────────────────────────
let _user      = null;   // { ...campos Firestore, _firebaseUser }
let _authReady = false;
const _waiters = [];     // resolvers en espera de que auth esté listo

// ── Normalización de strings para matching ────────────────────────
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// ── Matching con publicadores de Firestore ────────────────────────
function matchPublicador(displayName, pubs) {
  const normName   = normalize(displayName);
  const normTokens = normName.split(' ').filter(Boolean);

  // 1. Coincidencia exacta
  const exact = pubs.filter(p => normalize(p.nombre) === normName);
  if (exact.length === 1) return { pub: exact[0], confidence: 'exact' };

  // 2. Todos los tokens del nombre de Google están en el nombre del pub
  const tokens = pubs.filter(p => {
    const n = normalize(p.nombre);
    return normTokens.every(t => n.includes(t));
  });
  if (tokens.length === 1) return { pub: tokens[0], confidence: 'token' };
  if (tokens.length  > 1) return { pub: null, confidence: 'ambiguous', candidates: tokens };

  return { pub: null, confidence: 'none' };
}

async function tryMatch(displayName, congreId) {
  const snap = await getDocs(collection(db, 'congregaciones', congreId, 'publicadores'));
  const pubs  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return matchPublicador(displayName, pubs);
}

// ── Cargar o crear usuario en Firestore ───────────────────────────
async function loadOrCreateUser(fbUser) {
  const ref  = doc(db, 'usuarios', fbUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { ...snap.data(), _firebaseUser: fbUser };
  }

  // Primera vez — intentar match automático con publicadores
  const congreId = sessionStorage.getItem('congreId');
  let matchedPublisherId = null;
  let matchEstado        = 'sin_match';

  if (congreId && fbUser.displayName) {
    const m = await tryMatch(fbUser.displayName, congreId);
    if (m.pub) {
      matchedPublisherId = m.pub.id;
      matchEstado        = 'ok';
    } else if (m.confidence === 'ambiguous') {
      matchEstado = 'pendiente';
    }
  }

  const data = {
    uid:               fbUser.uid,
    email:             fbUser.email,
    displayName:       fbUser.displayName || '',
    photoURL:          fbUser.photoURL    || null,
    birthDate:         null,
    sexo:              null,
    matchedPublisherId,
    congregacionId:    congreId || null,
    appRol:            matchEstado === 'ok' ? 'publicador' : 'pendiente',
    matchEstado,
    primerLogin:       true,
    createdAt:         serverTimestamp(),
  };

  await setDoc(ref, data);
  return { ...data, _firebaseUser: fbUser };
}

// ── Listener principal de Auth ────────────────────────────────────
onAuthStateChanged(auth, async (fbUser) => {
  try {
    _user = fbUser ? await loadOrCreateUser(fbUser) : null;
  } catch (err) {
    console.error('[auth] Error al cargar usuario:', err);
    _user = null;
  } finally {
    _authReady = true;
    _waiters.forEach(resolve => resolve(_user));
    _waiters.length = 0;
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: _user } }));
  }
});

// ── API pública (window) ──────────────────────────────────────────

/** Devuelve una Promise que resuelve cuando onAuthStateChanged disparó por primera vez. */
window.waitForAuth = () =>
  _authReady ? Promise.resolve(_user) : new Promise(r => _waiters.push(r));

/** Usuario actual (null si no está logueado). */
Object.defineProperty(window, 'currentUser', { get: () => _user });

/**
 * Verifica si el usuario actual tiene un permiso.
 * @param {string} feature — key de PERMISOS (ej: 'acceso_territorios')
 */
window.hasPermission = (feature) => {
  if (!_user) return false;
  return (PERMISOS[_user.appRol] || []).includes(feature);
};

/**
 * Guard: si el usuario no tiene el permiso, redirige a index.html.
 * Usar con await al inicio de cada módulo que requiere auth.
 * @param {string} feature
 */
window.authGuard = async (feature) => {
  await window.waitForAuth();
  if (!window.hasPermission(feature)) {
    window.location.replace('/?sin_acceso=1');
    throw new Error(`Sin acceso: ${feature}`);
  }
};

/** Abre el popup de Google y retorna el FirebaseUser. */
window.signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result   = await signInWithPopup(auth, provider);
  return result.user;
};

/** Cierra sesión. */
window.signOutUser = async () => {
  _user = null;
  await signOut(auth);
};

/**
 * Actualiza el perfil del usuario en Firestore y en memoria.
 * @param {Object} data — campos a actualizar en usuarios/{uid}
 */
window.updateUserProfile = async (data) => {
  if (!_user) throw new Error('No hay usuario logueado');
  const ref = doc(db, 'usuarios', _user.uid);
  await updateDoc(ref, data);
  Object.assign(_user, data);
};
