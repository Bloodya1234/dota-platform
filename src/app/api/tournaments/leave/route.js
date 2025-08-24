// ✅ FILE: /app/api/tournaments/leave/route.js
import { db } from '@/lib/firebase-admin';
import { getAuthSession } from '@/lib/auth';

export async function POST(req) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.uid) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const { tournamentId } = await req.json();
    if (!tournamentId) {
      return new Response(JSON.stringify({ message: 'Missing tournament ID' }), { status: 400 });
    }

    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const snapshot = await tournamentRef.get();
    if (!snapshot.exists) {
      return new Response(JSON.stringify({ message: 'Tournament not found' }), { status: 404 });
    }

    const tournament = snapshot.data();
    const steamId = session.user.uid;

    // For 1v1 tournament
    if (tournament.type === '1v1') {
      const updatedPlayers = tournament.players?.filter((id) => id !== steamId) || [];
      await tournamentRef.update({
        players: updatedPlayers,
        currentSlots: updatedPlayers.length,
      });
    }

    // For team-based tournaments
    if (tournament.type !== '1v1' && tournament.teams?.length) {
      const updatedTeams = tournament.teams
        .map((team) => ({
          ...team,
          members: team.members?.filter((m) => m.id !== steamId),
        }))
        .filter((team) => team.members?.length > 0);

      await tournamentRef.update({
        teams: updatedTeams,
        currentSlots: updatedTeams.reduce((sum, team) => sum + team.members.length, 0),
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('❌ Leave tournament error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
