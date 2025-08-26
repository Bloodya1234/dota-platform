import { getDb } from '@/lib/firebase-admin';
export const runtime = 'nodejs';
import { getAuthSession } from '@/lib/auth';

  
  




export async function POST(req) {const db = getDb();
  try {
    const session = await getAuthSession();
    console.log('👤 Session:', session);

    if (!session?.user?.uid) {
      console.warn('❌ No valid session found');
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 403 });
    }

    const userSnap = await db.collection('users').doc(session.user.uid).get();
    const user = userSnap.data();

    if (!user || user.role !== 'admin') {
      console.warn('⛔ Forbidden: Not an admin');
      return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
    }

    const { tournamentId, lobbyName, lobbyPassword, serverRegion } = await req.json();

    if (!tournamentId || !lobbyName || !lobbyPassword) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), { status: 400 });
    }

    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();

    if (!tournamentSnap.exists) {
      return new Response(JSON.stringify({ message: 'Tournament not found' }), { status: 404 });
    }

    const tournament = tournamentSnap.data();

    // Update lobby info
    await tournamentRef.update({
      lobbyName,
      lobbyPassword,
      serverRegion,
      lobbyAssignedAt: new Date(),
    });

    // ---- DM sender (uses external bot service) ----
    const botUrl = process.env.BOT_SERVER_URL; // e.g. https://your-bot-service.com
    if (!botUrl) {
      console.error('❗ BOT_SERVER_URL is not set');
      return new Response(JSON.stringify({ message: 'Server is not configured' }), { status: 500 });
    }

    const messages = [];

    const notifyPlayer = async (discordId, username) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const res = await fetch(`${botUrl.replace(/\/$/, '')}/send-dm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.BOT_API_KEY ? { Authorization: `Bearer ${process.env.BOT_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            discordId,
            message:
              `🎮 Your match for **${tournament.name}** is ready!\n\n` +
              `🧩 Lobby: \`${lobbyName}\`\n` +
              `🔐 Password: \`${lobbyPassword}\`\n` +
              `🌍 Region: \`${serverRegion || 'Not specified'}\``,
          }),
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeout);

        if (res.ok) {
          messages.push(`✅ Sent to ${username || discordId}`);
        } else {
          const text = await res.text().catch(() => '');
          console.error('❌ Failed to send DM:', discordId, res.status, text?.slice(0, 300));
          messages.push(`❌ DM failed for ${username || discordId} (${res.status})`);
        }
      } catch (err) {
        console.error('🔥 Error notifying player:', err?.name === 'AbortError' ? 'Timeout' : err?.message || err);
        messages.push(`❌ DM error for ${username || discordId}`);
      }
    };

    if (tournament.type === '1v1' && Array.isArray(tournament.playerObjects)) {
      console.log('📦 Notifying 1v1 players...');
      for (const player of tournament.playerObjects) {
        if (player.discordId) {
          await notifyPlayer(player.discordId, player.username || player.steamId);
        }
      }
    }

    if (['5v5', 'turbo'].includes(tournament.type) && Array.isArray(tournament.teamObjects)) {
      console.log('📦 Notifying 5v5/turbo teams...');
      for (const team of tournament.teamObjects) {
        for (const player of team.players || []) {
          if (player.discordId) {
            await notifyPlayer(player.discordId, player.username || player.steamId);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sentTo: messages }), { status: 200 });
  } catch (err) {
    console.error('🔥 Fatal error in assign-lobby-auto:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
