// src/app/api/tournaments/create/route.js
export const runtime = 'nodejs';

import { getDb } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ message: 'Invalid body' }), { status: 400 });
    }

    const docRef = await db.collection('tournaments').add({
      ...body,
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ ok: true, id: docRef.id }), { status: 200 });
  } catch (err) {
    console.error('❌ CREATE tournament error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
