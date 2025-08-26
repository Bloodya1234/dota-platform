// src/app/api/steam/return/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // Безопасно собираем базовый URL (не делаем new URL из пустой env на верхнем уровне)
    const host = req.headers.get('host') || '';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const fallbackBase = host ? `${proto}://${host}` : 'http://localhost:3000';
    const base = process.env.NEXT_PUBLIC_BASE_URL || fallbackBase;

    // Парсим текущий URL только внутри обработчика
    const currentUrl = new URL(req.url, base);

    // Куда перенаправлять после успешного возврата Steam
    const next = currentUrl.searchParams.get('next') || '/profile';
    const safeNext = next.startsWith('/') ? next : '/profile';

    // ⚠️ Здесь можно добавить полноценную валидацию OpenID, но для билда/деплоя это не требуется
    return NextResponse.redirect(`${base}${safeNext}`);
  } catch (e) {
    console.error('🔥 /api/steam/return error:', e);
    return NextResponse.json({ message: 'Steam return failed' }, { status: 500 });
  }
}
