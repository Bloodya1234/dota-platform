import { db } from '@/lib/firebase-admin';
import { getAuthSession } from '@/lib/auth';

export async function POST(req) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.uid) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userSnap = await db.collection('users').doc(session.user.uid).get();
    if (!userSnap.exists) {
      return new Response('User not found', { status: 404 });
    }

    const user = userSnap.data();
    if (user.role !== 'admin') {
      return new Response('Forbidden', { status: 403 });
    }

    const data = await req.json();
    const { name, type, bracket, maxSlots, prize, rules = '' } = data;

    if (!name || !type || !bracket || !maxSlots || !prize) {
      return new Response('Missing required fields', { status: 400 });
    }

    const numericSlots = Number(maxSlots);
    const format = numericSlots === 2 ? 'single' : 'bracket';

    await db.collection('tournaments').add({
      name,
      type,
      bracket,
      maxSlots: numericSlots,
      currentSlots: 0,
      prize,
      rules,
      createdAt: new Date(),
      isOpen: true,
      format, // ✅ auto-detected format field
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('🔥 Failed to create tournament:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
