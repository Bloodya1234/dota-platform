// src/app/api/tournaments/[id]/route.js
export const runtime = 'nodejs';

import { getDb } from '@/lib/firebase-admin';

export async function GET(_req, { params }) {
  try {
    const db = getDb();
    const tournamentRef = db.collection('tournaments').doc(params.id);
    const snapshot = await tournamentRef.get();

    if (!snapshot.exists) {
      return new Response(JSON.stringify({ message: 'Tournament not found' }), { status: 404 });
    }

    const tournament = snapshot.data();
    tournament.id = snapshot.id;

    return new Response(JSON.stringify(tournament), { status: 200 });
  } catch (err) {
    console.error('❌ GET tournament error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const db = getDb();
    const data = await req.json();

    const tournamentRef = db.collection('tournaments').doc(params.id);
    await tournamentRef.update(data);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('❌ PATCH tournament error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}