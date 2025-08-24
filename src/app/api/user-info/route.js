import { db } from '@/lib/firebase-admin';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user?.uid) {
      console.warn('No session found');
      return new Response('Unauthorized', { status: 401 });
    }

    const userSnap = await db.collection('users').doc(session.user.uid).get();

    if (!userSnap.exists) {
      console.warn('User doc not found for UID:', session.user.uid);
      return new Response('User not found', { status: 404 });
    }

    const user = userSnap.data();

    return new Response(
      JSON.stringify({ uid: session.user.uid, role: user.role || 'user' }),
      { status: 200 }
    );
  } catch (err) {
    console.error('🔥 /api/user-info error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
