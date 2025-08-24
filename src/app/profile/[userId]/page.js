'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/firebase';
import ClientLayout from '@/components/ClientLayout';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n.client';

const db = getFirestore(app);

function steam64To32(steam64) {
  return String(BigInt(steam64) - BigInt('76561197960265728'));
}

async function fetchWinRateAndRank(steamId) {
  try {
    const steamId32 = steam64To32(steamId.replace('steam:', ''));
    const [wlRes, profileRes] = await Promise.all([
      fetch(`https://api.opendota.com/api/players/${steamId32}/wl`),
      fetch(`https://api.opendota.com/api/players/${steamId32}`),
    ]);
    const [wlData, profileData] = await Promise.all([wlRes.json(), profileRes.json()]);

    const win = wlData.win || 0;
    const lose = wlData.lose || 0;
    const winRate = win + lose > 0 ? Math.round((win / (win + lose)) * 100) : 'N/A';

    const rankTier = profileData.rank_tier;
    let rank = 'Unranked';
    if (rankTier) {
      const names = {
        1: 'Herald', 2: 'Guardian', 3: 'Crusader', 4: 'Archon',
        5: 'Legend', 6: 'Ancient', 7: 'Divine', 8: 'Immortal'
      };
      const tier = Math.floor(rankTier / 10);
      const division = rankTier % 10;
      rank = `${names[tier] || 'Unknown'}${tier < 8 ? ` ${division}` : ''}`;
    }

    return { winRate, rank, matchCount: win + lose };
  } catch {
    return { winRate: 'N/A', rank: 'Unranked', matchCount: 0 };
  }
}

export default function PublicProfilePage() {
  const params = useParams();
  const { t } = useTranslation('common');
  const userId = decodeURIComponent(params?.userId);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleChangeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const { winRate, rank, matchCount } = await fetchWinRateAndRank(userData.steamId);

          const heroStatsRes = await fetch('https://api.opendota.com/api/heroStats');
          const heroStatsData = await heroStatsRes.json();

          const heroIdToName = {};
          if (Array.isArray(heroStatsData)) {
            heroStatsData.forEach((h) => {
              heroIdToName[h.id] = h.localized_name;
            });
          } else {
            console.error('Unexpected heroStatsData format:', heroStatsData);
          }

          let mostPlayed = [];
          if (Array.isArray(userData.mostPlayedHeroes)) {
            mostPlayed = userData.mostPlayedHeroes.map(id => heroIdToName[id] || id);
          } else if (userData.mostPlayedHeroes?.name) {
            mostPlayed = [userData.mostPlayedHeroes.name];
          }

          const isEligible =
            (userData?.rankedMatchCount || matchCount) >= 200 &&
            userData?.publicMatchHistory === true;

          setUser({
            ...userData,
            winRate,
            rank,
            mostPlayed,
            isEligible,
            matchCount,
            heroIdToName,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (loading) return <ClientLayout><div className="p-6 text-center text-white">{t('loading')}</div></ClientLayout>;
  if (!user) return <ClientLayout><div className="p-6 text-center text-red-500">{t('user_not_found')}</div></ClientLayout>;

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto px-6 py-10 text-primary font-orbitron">
        {/* Language Switcher */}
        <div className="flex justify-end gap-2 mb-6">
          <button onClick={() => handleChangeLanguage('en')} className="glow-button">EN</button>
          <button onClick={() => handleChangeLanguage('ru')} className="glow-button">RU</button>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative w-[100px] h-[100px]">
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-md animate-pulse shadow-[0_0_15px_#00ffe5] z-0"></div>
            <Image
              src={user.avatar || '/default-avatar.png'}
              alt="avatar"
              width={100}
              height={100}
              className="rounded-full border-4 border-accent relative z-10 object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-accent text-glow tracking-wide uppercase">
              {user.name || t('profile.unnamed')}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Steam ID: {user.steamId64}</p>
            <p className={`text-sm mt-2 font-semibold ${user.isEligible ? 'text-green-400' : 'text-red-500'}`}>
              {user.isEligible ? t('profile.eligible') : t('profile.not_eligible')}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="glow-panel border border-accent rounded-xl p-4 space-y-3">
          <p><strong>🏆 {t('profile[id].rank')}:</strong> {user.rank}</p>
          <p><strong>⚔️ {t('profile[id].win_rate')}:</strong> {user.winRate}%</p>
          <p><strong>🎮 {t('profile[id].ranked_matches')}:</strong> {user.rankedMatchCount || user.matchCount || 'N/A'}</p>
          <p><strong>🔥 {t('profile[id].most_played')}:</strong> {user.mostPlayed?.join(', ') || 'N/A'}</p>
          <p><strong>🗣️ {t('profile[id].languages_spoken')}:</strong> {user.languages?.join(', ') || 'N/A'}</p>
          <p><strong>🧭 {t('profile[id].preferred_positions')}:</strong> {user.preferredPositions?.join(', ') || 'N/A'}</p>
        </div>

        {/* Team Info */}
        {user.team?.name && (
          <div className="mt-6 glow-panel border border-green-400 rounded-xl p-4">
            <h2 className="text-xl font-bold text-[#2ac8d9] uppercase tracking-wide mb-2">{t('profile.team_title')}</h2>
            <p className="text-white">{t('profile.team_name')}: {user.team.name} ({user.team.role})</p>
            <p className="text-white">{t('profile.position')}: {user.team.position || t('profile.not_set')}</p>
          </div>
        )}

        {/* Matches */}
        {Array.isArray(user.matches) && user.matches.length > 0 && (
          <div className="mt-6 glow-panel border border-cyan-400 rounded-xl p-4">
            <h2 className="text-xl font-bold text-[#2ac8d9] uppercase tracking-wide mb-3">{t('profile.recent_matches')}</h2>
            <ul className="space-y-2 text-sm">
              {user.matches.slice(0, 10).map((match, index) => {
                const [heroId, outcome] = match.split('|');
                const heroName = user.heroIdToName?.[parseInt(heroId)] || heroId;
                return (
                  <li
                    key={index}
                    className="flex justify-between items-center bg-[#111] border border-gray-700 rounded-lg px-4 py-2 hover:shadow-neon"
                  >
                    <span className="text-white">{heroName}</span>
                    <span className={`font-semibold ${outcome === 'Win' ? 'text-green-400' : 'text-red-400'}`}>
                      {outcome}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
