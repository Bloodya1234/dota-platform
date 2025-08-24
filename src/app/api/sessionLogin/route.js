import { adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(req) {
  const { token } = await req.json();
  const maxAge = 60 * 60 * 24 * 5; // 5 days

  try {
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: maxAge * 1000,
    });

    const cookieStore = cookies();

    // ✅ Set the session cookie correctly
    cookieStore.set('__session', sessionCookie, {
      maxAge,
      httpOnly: true,
      secure: false, // ✅ Set to true in production
      sameSite: 'lax',
      path: '/',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ Failed to create session cookie:', err);
    return new Response('Invalid token', { status: 401 });
  }
}
