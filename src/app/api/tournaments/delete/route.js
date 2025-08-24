import { db } from '@/lib/firebase-admin';
import { getAuthSession } from '@/lib/auth';

export async function DELETE(req) {
  try {
    console.log('🔥 DELETE route called');

    const session = await getAuthSession();
    if (!session?.user?.uid) {
      console.warn('⛔ Unauthorized');
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('✅ Session verified:', session.user.uid);

    const userSnap = await db.collection('users').doc(session.user.uid).get();
    if (!userSnap.exists) {
      console.warn('⛔ User not found in Firestore');
      return new Response('User not found', { status: 404 });
    }

    const user = userSnap.data();
    if (user.role !== 'admin') {
      console.warn('⛔ Forbidden — not admin:', user.role);
      return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(req.url, process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000');
    const id = url.searchParams.get('id');
    console.log('🆔 Tournament ID to delete:', id);

    if (!id) {
      console.warn('⛔ Missing ID in query');
      return new Response('Missing tournament ID', { status: 400 });
    }

    await db.collection('tournaments').doc(id).delete();
    console.log('✅ Deleted tournament:', id);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('🔥 DELETE tournament failed:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
