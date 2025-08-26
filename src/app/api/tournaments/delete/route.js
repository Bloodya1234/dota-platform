// src/app/api/tournaments/delete/route.js
export const runtime = 'nodejs';

import { getDb } from '@/lib/firebase-admin';

export async function DELETE(req) {
  try {
    const db = getDb();
    const { id } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ message: 'id required' }), { status: 400 });
    }

    await db.collection('tournaments').doc(id).delete();
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('❌ DELETE tournament error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
