// src/app/api/discord/callback/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBaseUrl(req) {
  const host = req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const fallback = host ? `${proto}://${host}` : 'http://localhost:3000';
  return process.env.NEXT_PUBLIC_BASE_URL || fallback;
}

function encodeForm(data) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== 'undefined' && v !== null) params.set(k, String(v));
  }
  return params.toString();
}

export async function GET(req) {
  const base = getBaseUrl(req);

  try {
    const url = new URL(req.url, base);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '';
    if (!code) {
      return NextResponse.redirect(`${base}/connect-discord?error=missing_code`);
    }

    // Читаем клиентские переменные для Discord
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri =
      process.env.DISCORD_REDIRECT_URI || `${base}/api/discord/callback`;

    if (!clientId || !clientSecret) {
      // Не валим билд: просто редиректим с ошибкой конфигурации
      return NextResponse.redirect(`${base}/connect-discord?error=discord_env_missing`);
    }

    // Обмениваем code -> access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeForm({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text().catch(() => '');
      return NextResponse.redirect(
        `${base}/connect-discord?error=token_exchange_failed&detail=${encodeURIComponent(
          txt.slice(0, 200),
        )}`,
      );
    }

    const token = await tokenRes.json();
    const accessToken = token.access_token;

    // Получаем юзера из Discord
    let discordUser = null;
    try {
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        discordUser = await userRes.json();
      }
    } catch {
      // игнор — не блокируем редирект
    }

    // ⚠️ ВАЖНО: здесь сознательно НЕ используем firebase-admin на верхнем уровне.
    // Если хочешь записать связку Discord->пользователь в Firestore — делай это ТОЛЬКО здесь, внутри обработчика:
    //
    // import { getDb } from '@/lib/firebase-admin';
    // const db = getDb();
    // await db.collection('users').doc(currentUid).update({ discord: { id: discordUser.id, username: discordUser.username, ... } });

    // Редирект обратно в UI
    const to = new URL('/connect-discord', base);
    to.searchParams.set('ok', '1');
    if (state) to.searchParams.set('state', state);
    if (discordUser?.id) to.searchParams.set('discordId', discordUser.id);
    return NextResponse.redirect(to.toString());
  } catch (e) {
    console.error('🔥 /api/discord/callback error:', e);
    return NextResponse.redirect(`${base}/connect-discord?error=callback_exception`);
  }
}
