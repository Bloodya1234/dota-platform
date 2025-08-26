// src/app/profile/ProfileClient.js
'use client';

import { useEffect, useState } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { app } from '@/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';

const auth = getAuth(app);
const db = getFirestore(app);

async function fetchWinRateAndRank(steamId64) {
  try {
    const id64 = (steamId64 || '').toString().replace(/^steam:/, '');
    const steam32 = (BigInt(id64) - 76561197960265728n).toString();

    const [wlRes, profileRes] = await Promise.all([
      fetch(`https://api.opendota.com/api/players/${steam32}/wl`, { cache: 'no-store' }),
      fetch(`https://api.opendota.com/api/players/${steam32}`, { cache: 'no-store' }),
    ]);

    const [wl, profile] = await Promise.all([wlRes.json(), profileRes.json()]);
    const win = wl?.win || 0;
    const lose = wl?.lose || 0;
    const winRate = win + lose > 0 ? Math.round((win / (win + lose)) * 100) : 'N/A';

    const rankTier = profile?.rank_tier;
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

export default function ProfileClient() {
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [stats, setStats] = useState({ winRate: 'N/A', rank: 'Unranked' });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fu) => {
      setFirebaseUser(fu || null);
      if (!fu) {
        setUserDoc(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', fu.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserDoc({ id: snap.id, ...data });
          // подтянем стату уже на клиенте, чтобы не мешать билду
          const sid = data?.steamId || fu.uid;
          fetchWinRateAndRank(sid).then(setStats);
        } else {
          setUserDoc(null);
        }
      } catch (e) {
        console.error('Profile load error:', e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto p-6">Loading profile…</div>
      </ClientLayout>
    );
  }

  if (!firebaseUser) {
    return (
      <ClientLayout>
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
          <p className="mb-4 text-gray-600">Please log in to view your profile.</p>
          <Link href="/login" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">
            Go to login
          </Link>
        </div>
      </ClientLayout>
    );
  }

  const avatar = userDoc?.avatar || '/default-avatar.png';
  const username = userDoc?.username || userDoc?.name || 'Player';
  const steamIdShown = (userDoc?.steamId || firebaseUser.uid || '').replace(/^steam:/, '');

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Image src={avatar} alt="avatar" width={72} height={72} className="rounded-full" />
          <div>
            <h1 className="text-2xl font-bold">{username}</h1>
            <p className="text-gray-600">SteamID64: {steamIdShown}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border rounded p-4 bg-white shadow">
            <div className="text-sm text-gray-500">Rank</div>
            <div className="text-xl font-semibold">{stats.rank}</div>
          </div>
          <div className="border rounded p-4 bg-white shadow">
            <div className="text-sm text-gray-500">Win Rate</div>
            <div className="text-xl font-semibold">
              {stats.winRate === 'N/A' ? 'N/A' : `${stats.winRate}%`}
            </div>
          </div>
        </div>

        <div className="space-x-3">
          <Link href="/find" className="inline-block bg-gray-200 px-3 py-2 rounded">
            Find teams/players
          </Link>
          <Link href="/tournaments" className="inline-block bg-gray-200 px-3 py-2 rounded">
            Browse tournaments
          </Link>
        </div>
      </div>
    </ClientLayout>
  );
}
