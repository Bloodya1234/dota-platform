import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snapshot = await db.collection('tournaments').get();
    const tournaments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return new Response(JSON.stringify(tournaments), { status: 200 });
  } catch (err) {
    console.error('🔥 Failed to load tournaments:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
