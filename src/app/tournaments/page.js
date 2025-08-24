'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinedTournaments, setJoinedTournaments] = useState({});
  const router = useRouter();

  useEffect(() => {
    const loadTournamentsAndJoinStatus = async () => {
      try {
        const tourRes = await fetch('/api/tournaments');
        const tourData = await tourRes.json();
        setTournaments(tourData);

        const userRes = await fetch('/api/user-info', { credentials: 'include' });
        const user = await userRes.json();
        const userDocRes = await fetch(`/api/users/${user.uid}`);
        const userDoc = await userDocRes.json();

        console.log('✅ Fetched userDoc:', userDoc);

        const joined = {};
        for (const t of tourData) {
          if (t.type === '1v1') {
            joined[t.id] = t.players?.includes(user.uid);
          } else if (['5v5', 'turbo'].includes(t.type)) {
            joined[t.id] = t.teams?.includes(userDoc.teamId);
          }
        }

        setJoinedTournaments(joined);
      } catch (err) {
        console.warn('⚠️ Could not load tournaments:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTournamentsAndJoinStatus();
  }, []);

  const handleJoin = async (tournamentId) => {
    try {
      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) throw new Error('Tournament not found');

      const userRes = await fetch('/api/user-info', { credentials: 'include' });
      const user = await userRes.json();
      const userDocRes = await fetch(`/api/users/${user.uid}`);
      const userDoc = await userDocRes.json();

      console.log('✅ Fetched userDoc:', userDoc);

      const errors = [];

      // ✅ Match count validation
      const matchCount = parseInt(userDoc.rankedMatchCount ?? userDoc.matchCount ?? 0, 10);
      if (matchCount < 200) {
        errors.push(`❌ You need at least 200 ranked matches. You have ${matchCount}.`);
      }

      // ✅ Rank bracket validation from rankTier
      const rankTier = parseInt(userDoc.rankTier ?? 0);
      const userRank = getRankFromTier(rankTier);
      const bracket = (tournament.bracket || '').toLowerCase();

      const bracketToRanks = {
        'herald only': ['herald'],
        'guardian only': ['guardian'],
        'archon-legend': ['archon', 'legend'],
        'ancient-divine': ['ancient', 'divine'],
        'immortal only': ['immortal'],
        'all ranks': ['herald', 'guardian', 'crusader', 'archon', 'legend', 'ancient', 'divine', 'immortal'],
      };

      const allowedRanks = bracketToRanks[bracket] || [];
      if (!allowedRanks.includes(userRank)) {
        errors.push(`❌ Your rank "${userRank}" is not allowed. This tournament is for: ${allowedRanks.join(', ')}`);
      }

      if (errors.length > 0) {
        alert(`🚫 You are not eligible to join this tournament:\n\n${errors.join('\n')}`);
        return;
      }

      const res = await fetch('/api/tournaments/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId }),
        credentials: 'include',
      });

      const result = await res.json();

      if (!res.ok) {
        const reasonList = result.reasons?.length
          ? `\n\nDetails:\n• ${result.reasons.join('\n• ')}`
          : '';
        throw new Error(result.message + reasonList);
      }

      alert('✅ Successfully joined tournament');
      setJoinedTournaments((prev) => ({ ...prev, [tournamentId]: true }));
      window.open(`/tournaments/${tournamentId}`, '_blank');
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  const getRankFromTier = (tier) => {
    if (!tier) return '';
    const base = Math.floor(tier / 10);
    return [
      '',
      'herald',
      'guardian',
      'crusader',
      'archon',
      'legend',
      'ancient',
      'divine',
      'immortal',
    ][base] || '';
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="p-6 text-white">Loading tournaments...</div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold mb-4">Tournaments</h1>
        {tournaments.length === 0 ? (
          <p className="text-gray-400">No tournaments available at the moment.</p>
        ) : (
          <table className="min-w-full border border-gray-700 text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Rank</th>
                <th className="p-2 border">Slots</th>
                <th className="p-2 border">Prize Pool</th>
                <th className="p-2 border">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white text-black">
              {tournaments.map((t) => (
                <tr key={t.id} className="text-center border-t border-gray-600">
                  <td className="p-2 border font-medium">
                    {joinedTournaments[t.id] ? (
                      <a
                        href={`/tournaments/${t.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {t.name}
                      </a>
                    ) : (
                      t.name
                    )}
                  </td>
                  <td className="p-2 border">{t.type}</td>
                  <td className="p-2 border">{t.bracket}</td>
                  <td className="p-2 border">{t.currentSlots}/{t.maxSlots}</td>
                  <td className="p-2 border">{t.prize}$</td>
                  <td className="p-2 border space-x-2">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white disabled:opacity-50"
                      onClick={() => handleJoin(t.id)}
                      disabled={joinedTournaments[t.id]}
                    >
                      {joinedTournaments[t.id] ? 'Joined' : 'Join'}
                    </button>
                    {joinedTournaments[t.id] && (
                      <button
                        className="bg-gray-700 hover:bg-gray-800 px-3 py-1 rounded text-white"
                        onClick={() => window.open(`/tournaments/${t.id}`, '_blank')}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
