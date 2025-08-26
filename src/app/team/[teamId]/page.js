'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { app } from '@/firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const db = getFirestore(app);

export default function TeamPublicPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!teamId) return;
        const snap = await getDoc(doc(db, 'teams', teamId));
        if (!cancelled) {
          if (snap.exists()) {
            setTeam({ id: snap.id, ...snap.data() });
          } else {
            setTeam(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [teamId]);

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6">Loading team…</div>;
  }

  if (!team) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Team not found</h1>
        <Link href="/find" className="text-blue-600 underline">Back to search</Link>
      </div>
    );
  }

  const members = Array.isArray(team.members) ? team.members : [];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <Image
          src={team.logo || '/default-avatar.png'}
          alt="team logo"
          width={64}
          height={64}
          className="rounded"
        />
        <div>
          <h1 className="text-2xl font-bold">{team.name || 'Team'}</h1>
          <div className="text-gray-600 text-sm">Members: {members.length}</div>
        </div>
      </div>

      {team.description && (
        <div className="border rounded p-4 bg-white mb-6">
          <div className="text-gray-700 whitespace-pre-wrap">{team.description}</div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3">Members</h2>
      {members.length === 0 ? (
        <div className="text-gray-600">No members yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id || m.steamId} className="border p-3 rounded bg-white text-sm">
              <Image
                src={m.avatar || '/default-avatar.png'}
                alt="avatar"
                width={40}
                height={40}
                className="rounded-full mb-2"
              />
              <div className="font-medium">
                {m.username || m.name || (m.steamId ? String(m.steamId) : 'Player')}
              </div>
              {m.rank && <div className="text-gray-600">Rank: {m.rank}</div>}
              {m.winRate && <div className="text-gray-600">WR: {m.winRate}%</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
