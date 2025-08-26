// src/app/api/tournaments/route.js
export const runtime = 'nodejs';

import { getDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const db = getDb();

    // Можно добавить фильтры через параметры запроса, если нужно
    const snap = await db
      .collection('tournaments')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (err) {
    console.error('❌ LIST tournaments error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
