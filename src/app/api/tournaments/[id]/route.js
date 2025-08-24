// ✅ FILE: /src/app/api/tournaments/[id]/route.js
import { db } from '@/lib/firebase-admin';

export async function GET(req, context) {
  const id = context.params?.id;

  try {
    const tournamentRef = db.collection('tournaments').doc(id);
    const snapshot = await tournamentRef.get();

    if (!snapshot.exists) {
      return new Response(JSON.stringify({ message: 'Tournament not found' }), { status: 404 });
    }

    const tournament = snapshot.data();
    tournament.id = snapshot.id;

    return new Response(JSON.stringify(tournament), { status: 200 });
  } catch (err) {
    console.error('❌ Error fetching tournament:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
