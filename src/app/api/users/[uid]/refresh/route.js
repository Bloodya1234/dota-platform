// src/app/api/users/[uid]/refresh/route.js
export const runtime = 'nodejs';

import { getDb } from '@/lib/firebase-admin';

export async function POST(_req, { params }) {
  try {
    const db = getDb();
    const ref = db.collection('users').doc(params.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    // Здесь могла быть твоя логика обновления профиля (OpenDota/Steam и т.д.)
    await ref.update({ refreshedAt: new Date() });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('❌ POST /api/users/[uid]/refresh error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
