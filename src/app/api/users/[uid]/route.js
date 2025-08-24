import { db } from '@/lib/firebase-admin';
import fetch from 'node-fetch';

const FRESHNESS_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

export async function GET(req, { params }) {
  const { uid } = params;
  if (!uid) return new Response('Missing UID', { status: 400 });

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) return new Response('User not found', { status: 404 });

    const userData = userSnap.data();
    const steamId32 = userData?.steamId32;
    if (!steamId32) return new Response('Missing steamId32', { status: 400 });

    let updatedFields = {};
    const now = Date.now();

    const lastFetched = userData.lastStatsRefresh || 0;
    const isStale = now - lastFetched > FRESHNESS_THRESHOLD_MS;

    if (isStale) {
      console.log(`🔄 Refreshing OpenDota stats for ${uid} (${steamId32})`);

      // Fetch OpenDota player overview
      const [playerRes, matchesRes, heroesRes] = await Promise.all([
        fetch(`https://api.opendota.com/api/players/${steamId32}`),
        fetch(`https://api.opendota.com/api/players/${steamId32}/matches?limit=20`),
        fetch(`https://api.opendota.com/api/players/${steamId32}/heroes`),
      ]);

      if (!playerRes.ok || !matchesRes.ok || !heroesRes.ok) {
        console.warn('⚠️ Failed to fetch OpenDota data');
        return new Response('OpenDota fetch failed', { status: 502 });
      }

      const playerData = await playerRes.json();
      const matches = await matchesRes.json();
      const heroes = await heroesRes.json();

      // Extract most played heroes (top 3 by games)
      const mostPlayedHeroes = (heroes || [])
        .sort((a, b) => b.games - a.games)
        .slice(0, 3)
        .map((h) => h.hero_id);

      // Count ranked matches (safe fallback using lobby_type)
      const rankedMatchCount = (matches || []).filter(
        (m) => m.lobby_type === 7 || ['Ranked All Pick', 'Ranked Draft', 'Ranked'].includes(m.game_mode_name || '')
      ).length;

      // Store 10 recent match summaries
      const matchSummary = (matches || []).slice(0, 10).map((m) => {
        const isRadiant = m.player_slot < 128;
        const won = (m.radiant_win && isRadiant) || (!m.radiant_win && !isRadiant);
        return `${m.hero_id}|${won ? 'Win' : 'Loss'}`;
      });

      // Convert rank
      const convertedRank = playerData?.rank_tier ? convertRankTier(playerData.rank_tier) : '';

      updatedFields = {
        mostPlayedHeroes,
        rankedMatchCount,
        matches: matchSummary,
        lastStatsRefresh: now,
        stats: {
          ...(userData.stats || {}),
          rank: convertedRank,
          rankedMatches: rankedMatchCount,
        },
        rank: convertedRank, // top-level for UI fallback
      };

      await userRef.update(updatedFields);
      console.log('✅ User stats refreshed and saved:', uid);
    }

    const freshSnap = await userRef.get();
    return new Response(JSON.stringify(freshSnap.data()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Failed to fetch/update user stats:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Helper to convert OpenDota's rank_tier (e.g., 74) to human-readable string
function convertRankTier(rankTier) {
  const tiers = ['Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'];
  const main = Math.floor(rankTier / 10);
  const star = rankTier % 10;
  return tiers[main - 1] ? `${tiers[main - 1]} ${star}` : '';
}
