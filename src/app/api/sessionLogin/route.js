// src/app/api/sessionLogin/route.js
export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ message: 'Token required' }), { status: 400 });
    }

    const auth = adminAuth();
    const maxAgeSec = 60 * 60 * 24 * 5; // 5 days
    const sessionCookie = await auth.createSessionCookie(token, { expiresIn: maxAgeSec * 1000 });

    cookies().set('session', sessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: maxAgeSec,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('sessionLogin error:', e?.message || e);
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }
}
