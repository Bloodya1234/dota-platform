// src/app/api/steam/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  // определяем базовый URL безопасно (если нет env — строим из заголовков)
  const host = req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const fallbackBase = host ? `${proto}://${host}` : 'http://localhost:3000';
  const base = process.env.NEXT_PUBLIC_BASE_URL || fallbackBase;

  // переносим query-параметры (next, inviteTeam и т.п.)
  const current = new URL(req.url, base);
  const next = current.searchParams.get('next') || '';
  const inviteTeam = current.searchParams.get('inviteTeam') || '';

  // формируем параметры OpenID (Steam)
  const returnTo = new URL('/api/steam/return', base);
  if (next) returnTo.searchParams.set('next', next);
  if (inviteTeam) returnTo.searchParams.set('inviteTeam', inviteTeam);

  const realm = base.endsWith('/') ? base : `${base}/`;

  const steam = new URL('https://steamcommunity.com/openid/login');
  steam.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
  steam.searchParams.set('openid.mode', 'checkid_setup');
  steam.searchParams.set('openid.return_to', returnTo.toString());
  steam.searchParams.set('openid.realm', realm);
  steam.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select');
  steam.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select');

  return NextResponse.redirect(steam.toString(), 302);
}
