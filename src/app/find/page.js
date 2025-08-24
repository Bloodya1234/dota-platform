'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n.client';
import { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/firebase';
import ClientLayout from '@/components/ClientLayout';
import Link from 'next/link';
import Image from 'next/image';

const db = getFirestore(app);
const auth = getAuth(app);

async function fetchWinRateAndRank(uid) {
  try {
    const steamId32 = BigInt(uid.replace('steam:', '')) - BigInt('76561197960265728');
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

    return { winRate, rank };
  } catch {
    return { winRate: 'N/A', rank: 'Unranked' };
  }
}

export default function FindPage() {
    const { t } = useTranslation('common'); // ⬅️ Add inside `FindPage()`
  const [view, setView] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [gamers, setGamers] = useState([]);
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [isCaptain, setIsCaptain] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      setUser({ ...userData, uid: firebaseUser.uid });

      if (userData.teamId) {
        const teamRef = doc(db, 'teams', userData.teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          setTeam({ id: teamSnap.id, ...teamData });
          setIsCaptain(teamData.captainId === firebaseUser.uid);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsSnapshot = await getDocs(collection(db, 'teams'));
        const teamsData = teamsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(team => team.name && team.members?.length > 0);
        setTeams(teamsData);

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = await Promise.all(usersSnapshot.docs.map(async doc => {
          const data = doc.data();
          const { winRate, rank } = await fetchWinRateAndRank(data.steamId || '');
          return {
            id: doc.id,
            ...data,
            rank,
            winRate
          };
        }));
        setGamers(usersData);
      } catch (error) {
        console.error('Error loading teams or users:', error);
      }
    };

    fetchData();
  }, []);

  const handleSendInvite = async (target) => {
    if (!team || !isCaptain) return;
    const discordId = target.discord?.id || target.discordId;
    if (!discordId) return;

    const res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientDiscordId: discordId,
        teamName: team.name,
        inviteLink: `${window.location.origin}/login?inviteTeam=${team.id}`,
      })
    });

    if (res.ok) alert('Invite sent!');
    else alert('Failed to send invite.');
  };

  const handleJoinRequest = async (team) => {
    if (!user || user.teamId) return;

    const res = await fetch('/api/send-join-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: team.id,
        userId: user.uid,
        userName: user.name || 'Player'
      }),
    });

    if (res.ok) {
      alert('Join request sent!');
    } else {
      const error = await res.json();
      alert(`Failed: ${error.error}`);
    }
  };

  return (
    <ClientLayout>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">{t('find.title')}</h1>

        <div className="flex gap-4 mb-6">
  <button
    className={`px-4 py-2 rounded ${view === 'teams' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
    onClick={() => setView('teams')}
  >
    {t('find.teams')}
  </button>
  <button
    className={`px-4 py-2 rounded ${view === 'gamers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
    onClick={() => setView('gamers')}
  >
    {t('find.gamers')}
  </button>
</div>


        {view === 'teams' && (
          <div className="space-y-6">
            {teams.map(team => (
              <div key={team.id} className="border p-4 rounded shadow bg-white">
                <div className="flex justify-between items-center">
                  <div>
                    <Link href={`/team/${team.id}`} className="text-lg font-semibold text-blue-600 hover:underline">
                      {team.name}
                    </Link>
                    <div className="text-sm text-gray-600">{team.members?.length || 0} {t('find.members')}</div>
                  </div>
                  {team.openForRequests && user && !user.teamId && (
                    <button
  onClick={() => handleJoinRequest(team)}
  className="bg-green-600 text-white px-3 py-1 rounded"
>
  {t('find.join_request')}
</button>

                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {team.members?.map(member => (
                    <div key={member.id} className="border p-2 rounded text-sm text-center">
                      <Image src={member.avatar || '/default-avatar.png'} alt="avatar" width={40} height={40} className="rounded-full mx-auto" />
                      <Link href={`/profile/${member.id}`} className="text-blue-600 hover:underline">
                        {member.username}
                      </Link>
                      <p>{member.rank || 'Unranked'}</p>
                      <p>WR: {member.winRate || 'N/A'}%</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'gamers' && (
          <div className="space-y-4">
            {gamers.map(user => (
              <div key={user.id} className="border p-4 rounded shadow bg-white flex justify-between items-center">
                <div>
                  <Link href={`/profile/${user.id}`} className="font-medium text-blue-600 hover:underline">
                    {user.name || 'Unnamed User'}
                  </Link>
                  <p className="text-sm">{t('find.rank')}: {user.rank || 'Unranked'}</p>
<p className="text-sm">{t('find.win_rate')}: {user.winRate || 'N/A'}%</p>
                </div>
                {user.openForInvites && (
                 <button
  disabled={!isCaptain}
  onClick={() => handleSendInvite(user)}
  className={`ml-4 px-4 py-2 rounded text-white text-sm ${
    isCaptain ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
  }`}
>
  {t('find.invite')}
</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
