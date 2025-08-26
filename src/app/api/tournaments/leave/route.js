// src/app/api/tournaments/leave/route.js
export const runtime = 'nodejs';

import { getDb } from '@/lib/firebase-admin';
import { getAuthSession } from '@/lib/auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req) {
  try {
    const session = await getAuthSession();
    const uid = session?.user?.uid;
    if (!uid || !uid.startsWith('steam:')) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const db = getDb();
    const { tournamentId } = await req.json();
    if (!tournamentId) {
      return new Response(JSON.stringify({ message: 'tournamentId required' }), { status: 400 });
    }

    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const [tSnap, uSnap] = await Promise.all([
      tournamentRef.get(),
      db.collection('users').doc(uid).get(),
    ]);

    if (!tSnap.exists) {
      return new Response(JSON.stringify({ message: 'Tournament not found' }), { status: 404 });
    }
    if (!uSnap.exists) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    const tournament = tSnap.data();
    const user = uSnap.data();

    // 1v1 — убираем игрока
    if (tournament.type === '1v1') {
      const updates = {
        players: FieldValue.arrayRemove(user.steamId),
        playerObjects: FieldValue.arrayRemove({
          steamId: user.steamId,
          username: user.username || null,
          discordId: user.discordId || null,
        }),
      };

      // безопасное уменьшение счётчика
      const currentSlots = Math.max(0, (tournament.currentSlots || 0) - 1);
      updates.currentSlots = currentSlots;

      // если был isLocked — снимаем
      if (tournament.isLocked) updates.isLocked = false;

      await tournamentRef.update(updates);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 5v5 / turbo — капитан выводит команду
    if (['5v5', 'turbo'].includes(tournament.type)) {
      if (!user.teamId) {
        return new Response(JSON.stringify({ message: 'You are not in a team' }), { status: 400 });
      }

      const teamRef = db.collection('teams').doc(user.teamId);
      const teamSnap = await teamRef.get();
      if (!teamSnap.exists) {
        return new Response(JSON.stringify({ message: 'Team not found' }), { status: 404 });
      }

      const team = teamSnap.data() || {};
      const teamId = team.id || teamSnap.id;

      if (team.captainId !== user.steamId) {
        return new Response(JSON.stringify({ message: 'Only the team captain can leave/unregister the team' }), { status: 403 });
      }

      const updates = {
        teams: FieldValue.arrayRemove(teamId),
        teamObjects: FieldValue.arrayRemove({
          teamId,
          teamName: team.name || null,
          players: (Array.isArray(team.members) ? team.members : []).map(m => ({
            steamId: m.steamId,
            username: m.username || null,
            discordId: m.discordId || null,
          })),
        }),
      };

      const currentSlots = Math.max(0, (tournament.currentSlots || 0) - 1);
      updates.currentSlots = currentSlots;
      if (tournament.isLocked) updates.isLocked = false;

      await tournamentRef.update(updates);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: 'Invalid tournament type' }), { status: 400 });
  } catch (err) {
    console.error('❌ LEAVE tournament error:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
