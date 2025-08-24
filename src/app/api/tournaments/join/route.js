import { DISCORD_ADMIN_WEBHOOK } from '@/lib/config';
import { db } from '@/lib/firebase-admin';
import { getAuthSession } from '@/lib/auth';
import { FieldValue } from 'firebase-admin/firestore';

const RANK_BRACKETS = {
  'Herald': [10, 19],
  'Guardian-Crusader': [20, 39],
  'Archon-Legend': [40, 59],
  'Ancient-Divine': [60, 79],
  'Immortal': [80, 90],
};
async function getRankedMatchCount(steamId32) {
  try {
    const res = await fetch(`https://api.opendota.com/api/players/${steamId32}/matches?limit=1000`);
    const matches = await res.json();
    if (!Array.isArray(matches)) {
      console.warn('Invalid response from OpenDota ranked match count:', matches);
      return 0;
    }
    return matches.filter((m) => m.lobby_type === 7).length;
  } catch (err) {
    console.error('Error fetching ranked match count:', err);
    return 0;
  }
}

function rankTierMatchesBracket(rankTier, bracket) {
  const [min, max] = RANK_BRACKETS[bracket] || [];
  return rankTier >= min && rankTier <= max;
}

function convertRankTierToRank(rankTier) {
  if (!rankTier || typeof rankTier !== 'number') return 'N/A';

  const ranges = {
    Herald: [10, 19],
    Guardian: [20, 29],
    Crusader: [30, 39],
    Archon: [40, 49],
    Legend: [50, 59],
    Ancient: [60, 69],
    Divine: [70, 79],
    Immortal: [80, 90],
  };

  for (const [rank, [min, max]] of Object.entries(ranges)) {
    if (rankTier >= min && rankTier <= max) return rank;
  }

  return 'N/A';
}

async function validatePlayer(user, bracket) {
  const issues = [];

  const steamIdRaw = user.steamId || '';
  const steamId64 = steamIdRaw.startsWith('steam:') ? steamIdRaw.replace('steam:', '') : steamIdRaw;
  const steamId32 = BigInt(steamId64) - 76561197960265728n;

  const rankedMatchCount = await getRankedMatchCount(steamId32);
  console.log('✅ Live rankedMatchCount:', rankedMatchCount);

  if (rankedMatchCount < 200) {
    issues.push(`At least 200 ranked matches are required (found ${rankedMatchCount})`);
  }

  if (!user.publicMatchHistory) {
    issues.push('Public match history must be enabled');
  }

  const playerRank = convertRankTierToRank(user.rankTier);
  if (!rankTierMatchesBracket(user.rankTier, bracket)) {
    issues.push(`Your rank (${playerRank}) does not match the bracket: ${bracket}`);
  }

  return issues;
}


export async function POST(req) {
  try {
    const session = await getAuthSession();
    const uid = session?.user?.uid;

    if (!uid || !uid.startsWith('steam:')) {
      console.error('❌ Invalid Steam UID in session:', uid);
      return new Response(JSON.stringify({ message: 'Unauthorized or invalid Steam login' }), { status: 401 });
    }

    const { tournamentId } = await req.json();
    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();
    if (!tournamentSnap.exists) {
      return new Response(JSON.stringify({ message: 'Tournament not found' }), { status: 404 });
    }

    const tournament = tournamentSnap.data();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    const user = userSnap.data();

    console.log('✅ User data before validation:', {
      steamId: user.steamId,
      rankTier: user.rankTier,
      rankedMatchCount: user.rankedMatchCount,
      publicMatchHistory: user.publicMatchHistory,
    });

    // ✅ 1v1
    if (tournament.type === '1v1') {
  if ((tournament.players || []).includes(user.steamId)) {
    return new Response(JSON.stringify({ message: 'You already joined this tournament' }), { status: 400 });
  }

  const issues = validatePlayer(user, tournament.bracket);
  if (issues.length) {
    return new Response(JSON.stringify({ message: 'Join failed', reasons: issues }), { status: 400 });
  }

  const updatedSlots = tournament.currentSlots + 1;

 const updates = {
  currentSlots: updatedSlots,
  players: FieldValue.arrayUnion(user.steamId),
  playerObjects: FieldValue.arrayUnion({
    steamId: user.steamId,
    username: user.username || null,
    discordId: user.discordId || null,
  }),
};


  if (updatedSlots === tournament.maxSlots && !tournament.isLocked) {
    updates.isLocked = true;
    updates.graceStart = new Date();

    if (DISCORD_ADMIN_WEBHOOK) {
      await fetch(DISCORD_ADMIN_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `📢 Tournament "${tournament.name}" is now full and locked. Ready for lobby assignment.`,
        }),
      });
    }
  }

  await tournamentRef.update(updates);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

    // ✅ 5v5 / turbo
    if (['5v5', 'turbo'].includes(tournament.type)) {
  if (!user.teamId) {
    return new Response(JSON.stringify({ message: 'You must be in a team to join this tournament' }), { status: 400 });
  }

  const teamRef = db.collection('teams').doc(user.teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    return new Response(JSON.stringify({ message: 'Team not found' }), { status: 404 });
  }

  const team = teamSnap.data();

  if ((tournament.teams || []).includes(team.id)) {
    return new Response(JSON.stringify({ message: 'Your team already joined this tournament' }), { status: 400 });
  }

  if (team.captainId !== user.steamId) {
    return new Response(JSON.stringify({ message: 'Only the team captain can register the team' }), { status: 403 });
  }

  const members = team.members || [];
  const issues = [];

  for (const member of members) {
  const memberIssues = await validatePlayer(member, tournament.bracket);
  if (memberIssues.length) {
    issues.push(`${member.username || member.id}: ${memberIssues.join(', ')}`);
  }
}

  if (issues.length) {
    return new Response(JSON.stringify({ message: 'Join failed', reasons: issues }), { status: 400 });
  }

  const updatedSlots = tournament.currentSlots + 1;

  const updates = {
  currentSlots: updatedSlots,
  teams: FieldValue.arrayUnion(team.id),
  teamObjects: FieldValue.arrayUnion({
    teamId: team.id,
    teamName: team.name || null,
    players: members.map(m => ({
      steamId: m.steamId,
      username: m.username || null,
      discordId: m.discordId || null,
    })),
  }),
};


  if (updatedSlots === tournament.maxSlots && !tournament.isLocked) {
    updates.isLocked = true;
    updates.graceStart = new Date();

    if (DISCORD_ADMIN_WEBHOOK) {
      await fetch(DISCORD_ADMIN_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `📢 Tournament "${tournament.name}" is now full and locked. Ready for lobby assignment.`,
        }),
      });
    }
  }

  await tournamentRef.update(updates);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
const rankEligibleMembers = members.filter(m => typeof m.rankTier === 'number');
if (rankEligibleMembers.length === 0) {
  return new Response(JSON.stringify({ message: 'Cannot calculate team average rank: no valid rank tiers found.' }), { status: 400 });
}

const totalRankTier = rankEligibleMembers.reduce((sum, m) => sum + m.rankTier, 0);
const averageRankTier = Math.round(totalRankTier / rankEligibleMembers.length);

if (!rankTierMatchesBracket(averageRankTier, tournament.bracket)) {
  const avgRankName = convertRankTierToRank(averageRankTier);
  return new Response(
    JSON.stringify({
      message: `Team average rank is ${avgRankName}. Please find a tournament that matches your team's average rank.`,
    }),
    { status: 400 }
  );
}

    return new Response(JSON.stringify({ message: 'Invalid tournament type' }), { status: 400 });
  } catch (err) {
    console.error('🔥 Error in /api/tournaments/join:', err);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
