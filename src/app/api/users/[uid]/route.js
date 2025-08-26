// src/app/api/users/[uid]/route.js
export const runtime = 'nodejs';

import { getDb } from '@/lib/firebase-admin';

export async function GET(_req, { params }) {
  try {
    const db = getDb();
    const snap = await db.collection('users').doc(params.uid).get();
    if (!snap.exists) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }
    const user = snap.data();
    return new Response(JSON.stringify({ id: snap.id, ...user }), { status: 200 });
  } catch (err) {
    console.error('❌ GET /api/users/[uid] error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const db = getDb();
    const data = await req.json();
    if (!data || typeof data !== 'object') {
      return new Response(JSON.stringify({ message: 'Invalid body' }), { status: 400 });
    }
    await db.collection('users').doc(params.uid).update({ ...data, updatedAt: new Date() });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('❌ PATCH /api/users/[uid] error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
