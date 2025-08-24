// src/lib/auth.js
"use server";

import * as admin from "firebase-admin";
import { cookies, headers } from "next/headers";

/** Считываем сервис-аккаунт из env (любой из форматов) */
function readServiceAccountFromEnv() {
  // Полный JSON
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json && json.trim().startsWith("{")) {
    return JSON.parse(json);
  }

  // Base64
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (b64) {
    const txt = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(txt);
  }

  // Раздельные переменные
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
  }

  return null;
}

function ensureAdminApp() {
  if (admin.apps.length) return admin.app();

  const sa = readServiceAccountFromEnv();

  if (sa?.private_key && (sa.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id ?? process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id ?? process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    return admin.app();
  }

  // Фоллбек: ADC (локалка с GOOGLE_APPLICATION_CREDENTIALS)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  return admin.app();
}

export async function getAdminAuth() {
  return ensureAdminApp().auth();
}

export async function getAdminFirestore() {
  return ensureAdminApp().firestore();
}

/** 🔹 То, чего не хватало: getAuthSession
 * Берём idToken из cookie (__session/session) или Authorization: Bearer <token>,
 * проверяем через firebase-admin и возвращаем минимальные данные.
 */
export async function getAuthSession() {
  const c = cookies();
  const sessionCookie = c.get("session")?.value ?? c.get("__session")?.value ?? null;

  let token = sessionCookie;
  if (!token) {
    const h = headers();
    const authHeader = h.get("authorization") || h.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  }
  if (!token) return null;

  try {
    const auth = await getAdminAuth();
    const decoded = await auth.verifyIdToken(token, true);
    const user = await auth.getUser(decoded.uid);

    return {
      uid: decoded.uid,
      email: user.email ?? null,
      emailVerified: user.emailVerified ?? false,
      claims: decoded
    };
  } catch {
    return null;
  }
}

/** Вспомогательно: прямая проверка idToken */
export async function verifyIdToken(idToken) {
  if (!idToken) return null;
  try {
    const auth = await getAdminAuth();
    return await auth.verifyIdToken(idToken, true);
  } catch {
    return null;
  }
}
