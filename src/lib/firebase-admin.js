// src/lib/firebase-admin.js
import admin from 'firebase-admin';

let initialized = false;

function ensureApp() {
  if (initialized && admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Явная проверка — чтобы сразу увидеть, чего не хватает
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase admin env. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  // Превращаем \n в реальные переводы строк
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  initialized = true;
  return admin.app();
}

export function getDb() {
  ensureApp();
  return admin.firestore();
}

export function adminAuth() {
  ensureApp();
  return admin.auth();
}

// опционально: default неанонимный (на случай старых импортов)
const adminApis = { getDb, adminAuth };
export default adminApis;
