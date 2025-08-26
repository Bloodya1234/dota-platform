// src/app/team/TeamClient.js
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ClientLayout from '@/components/ClientLayout';
import Link from 'next/link';
import Image from 'next/image';

import { app } from '@/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const auth = getAuth(app);
const db = getFirestore(app);

export default function TeamClient() {
  const sp = useSearchParams();
  const tab = sp.get('tab') || 'overview';

  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [team, setTeam] = useState(null);
  const [isCaptain, setIsCaptain] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fu) => {
      setFirebaseUser(fu || null);
      if (!fu) {
        setUserDoc(null);
        setTeam(null);
        setIsCaptain(false);
        setLoading(false);
        return;
      }
      try {
        const uSnap = await getDoc(doc(db, 'users', fu.uid));
        if (uSnap.exists()) {
          const u = uSnap.data();
          setUserDoc({ id: uSnap.id, ...u });

          if (u.teamId) {
            const tSnap = await getDoc(doc(db, 'teams', u.teamId));
            if (tSnap.exists()) {
              const t = tSnap.data();
              setTeam({ id: tSnap.id, ...t });
              setIsCaptain(t.captainId === fu.uid || t.captainId === u.steamId);
            } else {
              setTeam(null);
              setIsCaptain(false);
            }
          } else {
            setTeam(null);
            setIsCaptain(false);
          }
        } else {
          setUserDoc(null);
          setTeam(null);
          setIsCaptain(false);
        }
      } catch (e) {
        console.error('Team load error:', e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const members = useMemo(() => Array.isArray(team?.members) ? team.members : [], [team]);

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Team</h1>

        {loading && <div>Loading team…</div>}

        {!loading && !firebaseUser && (
          <div>
            <p className="mb-4 text-gray-600">Please log in to manage your team.</p>
            <Link href="/login" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">
              Go to login
            </Link>
          </div>
        )}

        {!loading && firebaseUser && !team && (
          <div className="space-y-3">
            <p className="text-gray-700">You are not in a team yet.</p>
            <div className="flex gap-3">
              <Link href="/find" className="bg-gray-200 px-3 py-2 rounded">
                Find teams/players
              </Link>
              <Link href="/team/create" className="bg-blue-600 text-white px-3 py-2 rounded">
                Create a team
              </Link>
            </div>
          </div>
        )}

        {!loading && team && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <Image
                  src={team.logo || '/default-avatar.png'}
                  alt="logo"
                  width={56}
                  height={56}
                  className="rounded"
                />
                <div>
                  <div className="text-xl font-semibold">{team.name}</div>
                  <div className="text-gray-500 text-sm">
                    Members: {members.length} {isCaptain ? '• You are captain' : ''}
                  </div>
                </div>
              </div>
              <div className="ml-auto flex gap-3">
                <Link href={`/team/${team.id}`} className="bg-gray-200 px-3 py-2 rounded">
                  Public page
                </Link>
                {isCaptain && (
                  <Link href={`/team/${team.id}/manage`} className="bg-blue-600 text-white px-3 py-2 rounded">
                    Manage
                  </Link>
                )}
              </div>
            </div>

            {/* простые табы по query ?tab=... */}
            <div className="flex gap-2 mb-4">
              <Link
                href={`/team?tab=overview`}
                className={`px-3 py-1 rounded ${tab === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Overview
              </Link>
              <Link
                href={`/team?tab=members`}
                className={`px-3 py-1 rounded ${tab === 'members' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Members
              </Link>
              <Link
                href={`/team?tab=invites`}
                className={`px-3 py-1 rounded ${tab === 'invites' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Invites
              </Link>
            </div>

            {tab === 'overview' && (
              <div className="border rounded p-4 bg-white">
                <div className="mb-2 text-gray-600 text-sm">Team ID: {team.id}</div>
                <div className="text-gray-700">Description: {team.description || '—'}</div>
              </div>
            )}

            {tab === 'members' && (
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
                    <div className="font-medium">{m.username || m.name || (m.steamId ? String(m.steamId) : 'Player')}</div>
                    {m.rank && <div className="text-gray-600">Rank: {m.rank}</div>}
                    {m.winRate && <div className="text-gray-600">WR: {m.winRate}%</div>}
                    {team.captainId && (m.id === team.captainId || m.steamId === team.captainId) && (
                      <div className="text-xs mt-1 inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Captain
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'invites' && (
              <div className="border rounded p-4 bg-white text-gray-700">
                <div>Use <code>/find</code> to invite players or enable join requests in team settings.</div>
              </div>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}
