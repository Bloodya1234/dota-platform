// src/lib/auth.js
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export async function getAuthSession() {
  const token = cookies().get('session')?.value;
  if (!token) return null;

  const auth = adminAuth(); // ← вызываем внутри функции
  const decoded = await auth.verifySessionCookie(token, true);
  return { user: { uid: decoded.uid } };
}
