'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n.client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/firebase';
import ClientLayout from '@/components/ClientLayout';

const auth = getAuth(app);
const db = getFirestore(app);

function steam64To32(steam64) {
  return String(BigInt(steam64) - BigInt('76561197960265728'));
}

function EligibilityModal({ show, onClose, t }) {
   const { t: tModal } = useTranslation('common');
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-[#121824] border border-accent text-primary rounded-xl p-6 w-full max-w-lg shadow-neon transition-all duration-300">
        <h2 className="text-xl font-bold mb-4 text-accent text-center">{t('eligibility.title')}</h2>

        <p className="mb-3 text-sm text-white/90">{t('eligibility.subtitle')}</p>

        <ul className="list-disc list-inside mb-4 space-y-1 text-sm text-white/80">
          <li>{t('eligibility.req_1')}</li>
          <li>{t('eligibility.req_2')}</li>
          <li>{t('eligibility.req_3')}</li>
        </ul>

        <p className="font-semibold mb-2 text-white">{t('eligibility.how_title')}</p>

        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 mb-6">
          <li>{t('eligibility.step_1')}</li>
          <li>{t('eligibility.step_2')}</li>
          <li>{t('eligibility.step_3')}</li>
          <li>{t('eligibility.step_4')}</li>
          <li>{t('eligibility.step_5')}</li>
        </ol>

        <div className="text-right">
          <button
            className="glow-button glow-orange px-4 py-2 font-semibold"
            onClick={onClose}
          >
            {t('eligibility.got_it')}
          </button>
        </div>
      </div>
    </div>
  );
}

async function syncRankedMatchCount(steamId32, userDocId, db) {
  try {
    const response = await fetch(`https://api.opendota.com/api/players/${steamId32}/matches?limit=1000`);
    const matches = await response.json();
    if (!Array.isArray(matches)) throw new Error('Invalid match data');
    const rankedMatches = matches.filter(match => match.lobby_type === 7);
    const count = rankedMatches.length;

    const userRef = doc(db, 'users', userDocId);
    await updateDoc(userRef, { rankedMatchCount: count });

    return count;
  } catch (error) {
    console.error('Error syncing ranked match count:', error);
    return null;
  }
}

export default function ProfilePage() {
  const { t } = useTranslation('common'); // ✅ use inside the component
  const handleChangeLanguage = (lng) => {
  i18n.changeLanguage(lng);
};
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dotaStats, setDotaStats] = useState(null);
  const [preferredPositions, setPreferredPositions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const positionOptions = ['Carry', 'Mid Lane', 'Offlane', 'Support', 'Hard Support'];
  const languageOptions = ['English', 'Russian', 'Spanish', 'French', 'German', 'Chinese'];

  const isEligible =
    (user?.rankedMatchCount || 0) >= 200 &&
    user?.publicMatchHistory === true;

  useEffect(() => {
    const seen = localStorage.getItem('seenEligibilityModal');
    if (!seen) {
      setShowModal(true);
      localStorage.setItem('seenEligibilityModal', 'true');
    }
  }, []);  const handleToggle = async (field, value, currentList) => {
    const updated = currentList.includes(value)
      ? currentList.filter((v) => v !== value)
      : [...currentList, value];

if (field === 'preferredPositions') setPreferredPositions(updated);
if (field === 'languages') setUser((prev) => ({ ...prev, languages: updated }));
    if (user?.steamId) {
      try {
        await updateDoc(doc(db, 'users', user.steamId), {
          [field]: updated,
        });
      } catch (err) {
        console.error(`Error saving ${field}:`, err);
      }
    }
  };

  const toggleInviteStatus = async () => {
    const newStatus = !user.openForInvites;
    setUser((prev) => ({ ...prev, openForInvites: newStatus }));
    if (user?.steamId) {
      try {
        await updateDoc(doc(db, 'users', user.steamId), {
          openForInvites: newStatus,
        });
      } catch (err) {
        console.error('Error updating invite status:', err);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        router.push('/login');
        return;
      }
      try {
        const rawUid = firebaseUser?.uid || '';
        const steamId64 = rawUid.startsWith('steam:') ? rawUid.replace('steam:', '') : rawUid;

        if (!steamId64 || isNaN(steamId64)) {
          console.error('Invalid Steam ID:', steamId64);
          setLoading(false);
          return;
        }

        const steamId32 = steam64To32(steamId64);
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({ ...userData, steamId: firebaseUser.uid, openForInvites: userData.openForInvites ?? true });
          await syncRankedMatchCount(steamId32, firebaseUser.uid, db);
          setPreferredPositions(userData.preferredPositions || []);

          const [profileRes, winLossRes, heroesRes, matchesRes, heroStatsRes] = await Promise.all([
            fetch(`https://api.opendota.com/api/players/${steamId32}`),
            fetch(`https://api.opendota.com/api/players/${steamId32}/wl`),
            fetch(`https://api.opendota.com/api/players/${steamId32}/heroes`),
            fetch(`https://api.opendota.com/api/players/${steamId32}/recentMatches`),
            fetch(`https://api.opendota.com/api/heroStats`),
          ]);

          const [profileData, winLossData, heroesData, matchesData, heroStats] = await Promise.all([
            profileRes.json(),
            winLossRes.json(),
            heroesRes.json(),
            matchesRes.json(),
            heroStatsRes.json(),
          ]);

          const estimatedMMR = profileData.mmr_estimate?.estimate || null;
          if (estimatedMMR && (!userData.mmr?.solo || userData.mmr?.solo !== estimatedMMR)) {
            await updateDoc(userRef, {
              'mmr.solo': estimatedMMR,
            });
          }
          await updateDoc(userRef, {
            'mmr.solo': estimatedMMR,
            rankTier: profileData.rank_tier || null,
            matchCount: winLossData.win + winLossData.lose,
            publicMatchHistory: profileData.profile?.is_public ?? true,
          });

          const heroIdToName = {};
          heroStats.forEach((h) => {
            heroIdToName[h.id] = h.localized_name;
          });

          const topHeroes = heroesData
            .sort((a, b) => b.games - a.games)
            .slice(0, 3)
            .map((h) => heroIdToName[h.hero_id] || h.hero_id);

         const recentMatches = matchesData.slice(0, 10).map((match) => {
  const heroId = match.hero_id;
  const heroName = heroIdToName[heroId] || heroId;
  const formattedHeroName = heroName.toLowerCase().replace(/[\s-]/g, '_');
const heroImg = `/apps/dota2/images/heroes/${formattedHeroName}_full.png`; // relative path for cdn.opendota.com

  return {
    hero: heroName,
    result:
      (match.player_slot < 128 && match.radiant_win) ||
      (match.player_slot >= 128 && !match.radiant_win)
        ? 'Win'
        : 'Loss',
    link: `https://www.opendota.com/matches/${match.match_id}`,
    heroImg,
  };
});

          const rankTier = profileData.rank_tier;
          let rank = 'N/A';
          let rankLabel = '';
          let rankIcon = null;

          if (rankTier) {
  const rankNames = {
    1: 'Herald',
    2: 'Guardian',
    3: 'Crusader',
    4: 'Archon',
    5: 'Legend',
    6: 'Ancient',
    7: 'Divine',
    8: 'Immortal',
  };
  const rankDivision = rankTier % 10;
  const rankNameKey = Math.floor(rankTier / 10);
  rankLabel = rankNames[rankNameKey] || 'Unknown';
  rank = `${rankLabel} ${rankLabel !== 'Immortal' ? rankDivision : ''}`.trim();
  rankIcon = `https://steamcdn-a.akamaihd.net/apps/dota2/images/rank_icons/rank_icon_${rankTier}.png`;

}


          const win = winLossData.win || 0;
          const lose = winLossData.lose || 0;

          setDotaStats({
            rank,
            rankIcon,
            winRate: win + lose > 0 ? Math.round((win / (win + lose)) * 100) : 'N/A',
            wins: win,
            losses: lose,
            topHeroes,
            recentMatches,
            estimatedMMR,
          });
        }
      } catch (error) {
        console.error('Error fetching profile or stats:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);
  if (loading) return <div className="p-6 text-center text-white">Loading...</div>;
  if (!user || !dotaStats) return <div className="p-6 text-center text-red-500">User not found or Dota stats missing.</div>;

  return (
  <ClientLayout>
  <div className="min-h-screen bg-background text-primary">
    <EligibilityModal show={showModal} onClose={() => setShowModal(false)} />

    <div className="max-w-6xl mx-auto px-6 py-10 font-orbitron space-y-10">
     {/* Header */}
<div className="flex items-center justify-between flex-wrap gap-6 px-4 py-6 glow-panel rounded-2xl">
  {/* Avatar with glow ring */}
  <div className="relative w-32 h-32 flex-shrink-0 rounded-full avatar-glow-ring overflow-hidden border-2 border-accent">
    <Image
      src={user.avatar || '/default-avatar.png'}
      alt="Avatar"
      width={128}
      height={128}
      className="w-full h-full object-cover rounded-full"
    />
  </div>

  {/* Info Block */}
  <div className="flex-1 min-w-[220px] ml-[2.5rem]"> {/* ~1cm spacing */}
    <h1 className="text-4xl font-extrabold uppercase text-accent text-glow tracking-wide">
      {user.name || 'Unknown'}
    </h1>
    <p className="text-[10px] text-accent mt-1"> {/* 2x smaller */}
      Steam ID: {user.steamId}
    </p>
...
...
<p className={`text-[10px] font-semibold mt-2 ${isEligible ? 'text-green-400' : 'text-red-500'}`}>
  {isEligible
    ? t('profile.eligible')
    : t('profile.not_eligible')}
</p>
  </div>

  {/* Action Buttons */}
  <div className="flex flex-col sm:flex-row gap-4">
   <button
  className={`glow-button ${user.openForInvites ? 'glow-green' : 'glow-red'}`}
  onClick={toggleInviteStatus}
>
  {user.openForInvites ? t('profile.open_invites') : t('profile.closed_invites')}
</button>

<button
  onClick={() => setShowModal(true)}
  className="glow-button glow-orange"
>
  {t('profile.instructions')}
</button>
  </div>
</div>


   {/* Overview Boxes */}
<div className="w-full overflow-x-auto">
  <div className="flex flex-row justify-center items-start gap-6 min-w-[960px] px-4">
    
   {/* Rank Name + Ranked Matches */}
<div className="card w-[300px] text-center shrink-0">
  {dotaStats.rankIcon ? (
   <Image
  src={dotaStats.rankIcon}
  alt="Rank"
  width={64}
  height={64}
  className="mx-auto my-2"
/>
  ) : (
    <div className="text-sm text-gray-500 mt-2">No Rank Icon</div>
  )}
  <p className="text-xl font-bold text-white">{dotaStats.rank}</p>

  <div className="mt-4">
    <p className="text-sm text-accent">Ranked Matches</p>
    <p className="text-3xl font-bold text-white">{user.rankedMatchCount || 0}</p>
  </div>
</div>


    {/* Win Rate */}
    <div className="card w-[300px] text-center shrink-0">
      <p className="text-sm text-accent mb-2">Win Rate</p>
      <p className="text-6xl font-extrabold text-[#00ffbf]">{dotaStats.winRate}%</p>
      <p className="text-sm text-white mt-1">
        {dotaStats.wins} Wins / {dotaStats.losses} Losses
      </p>
    </div>

    {/* Top Heroes */}
    <div className="card w-[300px] text-center shrink-0">
      <p className="text-sm text-accent mb-2">Top Heroes</p>
      <div className="flex flex-col items-center gap-1">
        {dotaStats.topHeroes.length > 0 ? (
          dotaStats.topHeroes.map((hero, idx) => (
            <p key={idx} className="text-white text-xs">{hero}</p>
          ))
        ) : (
          <p className="text-gray-500 text-xs">N/A</p>
        )}
      </div>
    </div>
  </div>
</div>



  <div className="flex justify-center w-full px-4 py-6">
  <div className="flex w-full max-w-6xl justify-between gap-6">
    {/* Languages Spoken (Left) */}
    <div className="w-1/2 glow-panel rounded-2xl border border-cyan-500 p-6">
     <h2 className="text-lg font-bold text-cyan-400 uppercase text-center mb-4 tracking-wide">
  {t('profile.languages_spoken')}
</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {languageOptions.map((lang) => (
          <button
            key={lang}
            onClick={() => handleToggle('languages', lang, user.languages || [])}
            className={`hex-button text-sm ${
              user.languages?.includes(lang) ? 'active-cyan' : ''
            }`}
          >
            {lang}
          </button>
        ))}
      </div>
    </div>

    {/* Preferred Positions (Right) */}
    <div className="w-1/2 glow-panel rounded-2xl border border-green-500 p-6">
      <h2 className="text-lg font-bold text-cyan-400 uppercase text-center mb-4 tracking-wide">
  {t('profile.preferred_positions')}
</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {positionOptions.map((pos) => (
          <button
            key={pos}
            onClick={() => handleToggle('preferredPositions', pos, preferredPositions)}
            className={`hex-button text-sm ${
              preferredPositions.includes(pos) ? 'active-green' : ''
            }`}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  </div>
</div>



      {/* Team & Match Info */}
      <div className="flex flex-col md:flex-row gap-6 justify-between">
        {/* Team Info */}
        {user.team && (
  <div className="glow-panel p-6 rounded-2xl border border-cyan-500 w-full md:max-w-md">
    <h2 className="text-lg font-bold text-cyan-400 uppercase mb-4 tracking-wide">
  {t('profile.team_title')}
</h2>
    <div className="grid grid-cols-2 gap-y-2 text-white text-sm font-medium">
      <div className="text-left text-accent">{t('profile.team_name')}</div>
      <div className="text-left">{user.team.name}</div>

      <div className="text-left text-accent">{t('profile.role')}</div>

      <div className="text-left">{user.team.role}</div>

      <div className="text-left text-accent">{t('profile.position')}</div>

      <div className="text-left">{user.team.position || t('profile.not_set')}</div>

    </div>
  </div>
)}
{/* Recent Matches */}
<div className="w-full max-w-[720px] mx-auto glow-panel p-5 rounded-2xl border border-cyan-500">
  <div className="flex justify-between items-center mb-4">
   <h2 className="text-lg font-bold text-cyan-400 uppercase tracking-wide">
  {t('profile.recent_matches')}
</h2>

    <a
      href="https://www.opendota.com/players/YOUR_ID"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 text-sm hover:underline"
    >
      OpenDota
    </a>
  </div>

  <ul className="space-y-2">
    {dotaStats.recentMatches.slice(0, 10).map((match, index) => {
      const imageUrl = `https://steamcdn-a.akamaihd.net/apps/dota2/images/heroes/${match.hero
        .toLowerCase()
        .replace(/[\s-]/g, '_')}_full.png`;

      return (
        <li
          key={index}
          className="flex justify-between items-center bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3"
        >
          {/* Left: Hero */}
          <div className="flex items-center gap-3">
            <Image
              src={imageUrl}
              alt={match.hero}
              width={40}
              height={40}
              className="rounded-md"
            />
            <span className="text-white text-sm font-semibold">
              {match.hero}
            </span>
          </div>

          {/* Right: Result + Link */}
          <div className="flex flex-col items-end text-right">
            <span
              className={`text-base font-bold ${
                match.result === 'Win' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {match.result}
            </span>
            <a
              href={match.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 text-xs hover:underline"
            >
              Open
            </a>
          </div>
        </li>
      );
    })}
  </ul>
</div>



    {/* Logout */}
<div className="text-center pt-6 mb-[4.8rem]">
 <button
  onClick={handleLogout}
  className="logout-button"
>
  {t('profile.logout')}
</button>
</div>

        </div>
      </div>
    </div>
  </ClientLayout>
);
}

