// src/app/api/send-join-request/route.js
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Собираем базовый URL безопасно (никаких new URL на верхнем уровне)
function getBaseUrl(req) {
  const host = req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const fallback = host ? `${proto}://${host}` : 'http://localhost:3000';
  return process.env.NEXT_PUBLIC_BASE_URL || fallback;
}

export async function POST(req) {
  try {
    const { teamId, userId, userName } = await req.json();

    if (!teamId || !userId || !userName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Ленивая инициализация admin SDK (через нашу обёртку)
    const db = getDb();

    // 1) Забираем команду
    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    const teamData = teamSnap.data();

    // 2) Капитан команды
    const captainId = teamData.captainId;
    if (!captainId) {
      return NextResponse.json({ error: 'Captain not assigned to team' }, { status: 400 });
    }

    const captainRef = db.collection('users').doc(captainId);
    const captainSnap = await captainRef.get();
    if (!captainSnap.exists) {
      return NextResponse.json({ error: 'Captain user not found' }, { status: 404 });
    }
    const captainData = captainSnap.data();

    // Пробуем обе схемы хранения дискорда
    const discordId = captainData?.discord?.id || captainData?.discordId;
    if (!discordId) {
      return NextResponse.json({ error: 'Captain does not have Discord connected' }, { status: 400 });
    }

    // 3) Сообщение и ссылки
    const base = getBaseUrl(req);
    const profileUrl = `${base}/profile/${encodeURIComponent(userId)}`;
    const message = `👋 User **${userName}** is requesting to join your team.\n\n🔗 View player profile: ${profileUrl}`;

    // 4) URL бота (только из ENV, не localhost)
    const rawBot = process.env.BOT_SERVER_URL || '';
    const botBase = rawBot.replace(/\/+$/, ''); // убираем хвостовой /
    if (!botBase) {
      return NextResponse.json({ error: 'BOT_SERVER_URL is not configured' }, { status: 500 });
    }

    // 5) Отправляем DM через бота (таймаут 7с)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`${botBase}/send-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, message }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Bot message failed', statusCode: res.status, detail: errorText.slice(0, 500) },
        { status: 502 }
      );
    }

    // 6) Записываем запрос в команду
    await teamRef.update({
      joinRequests: [
        ...(Array.isArray(teamData.joinRequests) ? teamData.joinRequests : []),
        {
          id: userId,
          username: userName,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ /api/send-join-request error:', err);
    return NextResponse.json({ error: 'Failed to notify captain' }, { status: 500 });
  }
}
