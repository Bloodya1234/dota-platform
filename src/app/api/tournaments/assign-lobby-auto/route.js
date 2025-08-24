import { db } from '@/lib/firebase-admin';
import { getAuthSession } from '@/lib/auth';

export async function POST(req) {
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
  serverRegion, // ✅ New field
  lobbyAssignedAt: new Date(),
});


    const messages = [];
    const notifyPlayer = async (discordId, username) => {
      try {
        const res = await fetch('http://localhost:3001/send-dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discordId,
           message: `🎮 Your match for **${tournament.name}** is ready!\n\n🧩 Lobby: \`${lobbyName}\`\n🔐 Password: \`${lobbyPassword}\`\n🌍 Region: \`${serverRegion || 'Not specified'}\``,
          }),
        });

        if (res.ok) {
          messages.push(`✅ Sent to ${username || discordId}`);
        } else {
          console.error('❌ Failed to send DM:', discordId);
        }
      } catch (err) {
        console.error('🔥 Error notifying player:', err.message || err);
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

    return new Response(JSON.stringify({
      success: true,
      sentTo: messages,
    }), { status: 200 });

  } catch (err) {
    console.error('🔥 Fatal error in assign-lobby-auto:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
