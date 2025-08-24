'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}`);
        if (!res.ok) throw new Error('Tournament not found');
        const data = await res.json();
        setTournament(data);
      } catch (err) {
        console.error('Error loading tournament:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTournament();
  }, [id]);

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave the tournament?')) return;
    setLeaving(true);
    try {
      const res = await fetch(`/api/tournaments/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: id }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to leave tournament');
      }

      alert('✅ Successfully left tournament');
      router.push('/tournaments');
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="p-6 text-white">Loading...</div>
      </ClientLayout>
    );
  }

  if (!tournament || !tournament.name) {
    return (
      <ClientLayout>
        <div className="p-6 text-red-500">Tournament not found</div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 text-white space-y-8">
        {/* 1. Info Message */}
        <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded border border-yellow-300 text-sm">
          <strong>Note:</strong> Once all slots are occupied, within 1 minute you will receive a message in Discord with Lobby info. You may leave the tournament safely before this.
        </div>

        {/* 2. Tournament Info */}
        <div className="bg-white text-black rounded shadow border overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Rank</th>
                <th className="p-2 border">Slots</th>
                <th className="p-2 border">Prize Pool</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-center border-t border-gray-600">
                <td className="p-2 border font-semibold">{tournament.name}</td>
                <td className="p-2 border">{tournament.type}</td>
                <td className="p-2 border">{tournament.bracket}</td>
                <td className="p-2 border">{tournament.currentSlots}/{tournament.maxSlots}</td>
                <td className="p-2 border">{tournament.prize}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. Participants */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Participants</h2>
          {tournament.type === '1v1' ? (
            <ul className="list-disc ml-5">
              {tournament.players?.length > 0 ? (
                tournament.players.map((playerId, i) => (
                  <li key={i}>{playerId}</li>
                ))
              ) : (
                <li>No players yet</li>
              )}
            </ul>
          ) : (
            <ul className="space-y-4">
              {tournament.teams?.length > 0 ? (
                tournament.teams.map((team, idx) => (
                  <li key={idx}>
                    <strong>{team.name || `Team ${idx + 1}`}</strong>
                    <ul className="list-disc ml-6">
                      {team.members?.map((member, i) => (
                        <li key={i}>{member.username || member.id}</li>
                      ))}
                    </ul>
                  </li>
                ))
              ) : (
                <li>No teams registered</li>
              )}
            </ul>
          )}
        </div>

        {/* 4. Rules */}
        {tournament.rules && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Rules</h2>
            <div className="bg-gray-900 text-white p-4 rounded border border-gray-700 whitespace-pre-line">
              {tournament.rules}
            </div>
          </div>
        )}

        {/* 5. Leave Button */}
        <div className="mt-6">
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded text-white font-semibold disabled:opacity-50"
          >
            {leaving ? 'Leaving...' : 'Leave Tournament'}
          </button>
        </div>
      </div>
    </ClientLayout>
  );
}
