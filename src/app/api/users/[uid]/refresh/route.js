import { db } from '@/lib/firebase-admin';
import { fetchOpenDotaStats } from '@/lib/opendota';

export async function GET(req, { params }) {
  const { uid } = params;
  if (!uid) return new Response('Missing UID', { status: 400 });

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return new Response('User not found', { status: 404 });

    const userData = userSnap.data();

    // Fetch latest stats from OpenDota
    const steamId32 = userData.steamId32;
    if (steamId32) {
      const updatedStats = await fetchOpenDotaStats(steamId32);

      await userRef.update({
        ...updatedStats,
        stats: {
          ...updatedStats,
        },
      });

      // Merge and return updated user data
      return new Response(JSON.stringify({ ...userData, ...updatedStats }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ Failed to fetch and update user:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
