// src/app/api/steam/steam-token/route.js
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { steamId } = await req.json();
    if (!steamId) {
      return new Response(JSON.stringify({ message: 'steamId required' }), { status: 400 });
    }

    // TODO: твоя реальная логика получения токена Steam
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('❌ steam-token error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
