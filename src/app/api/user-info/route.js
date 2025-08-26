// src/app/api/user-info/route.js
export const runtime = 'nodejs';

import { getDb } from '@/lib/firebase-admin';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();
    const uid = session?.user?.uid;

    if (!uid) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const db = getDb();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    const user = snap.data();
    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (err) {
    console.error('❌ USER-INFO error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
