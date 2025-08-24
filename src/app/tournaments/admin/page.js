'use client';

import { useEffect, useState } from 'react';

export default function AdminTournamentPage() {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    type: '1v1',
    bracket: 'Herald',
    maxSlots: 8,
    prize: '',
    rules: '',
  });

  const [tournaments, setTournaments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch('/api/user-info');
      if (!res.ok) return setLoading(false);
      const data = await res.json();
      if (data.role === 'admin') setAuthUser(data);
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const loadTournaments = async () => {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      setTournaments(data);
    };
    loadTournaments();
  }, [authUser]);
  const [activeTab, setActiveTab] = useState('tournaments');

// Lobby-related state
const [lobbyTournaments, setLobbyTournaments] = useState([]);
const [lobbyInputs, setLobbyInputs] = useState({});
// Shape: { [tournamentId]: { name: '', password: '' } }

useEffect(() => {
  if (!authUser || activeTab !== 'lobbies') return;

  const loadLobbies = async () => {
    const res = await fetch('/api/tournaments');
    const data = await res.json();
    const ready = data.filter(t => t.currentSlots === t.maxSlots && !t.lobbyLink);
    setLobbyTournaments(ready);
  };

  loadLobbies();
}, [authUser, activeTab]);

const handleLobbyChange = (id, field, value) => {
  setLobbyInputs(prev => ({
    ...prev,
    [id]: {
      ...prev[id],
      [field]: value,
    },
  }));
};

const assignLobby = async (id) => {
  const { name: lobbyName, password: lobbyPassword } = lobbyInputs[id] || {};
const generateLobbyInfo = (tournamentId) => {
  const randomName = `Match-${Math.floor(1000 + Math.random() * 9000)}`;
  const randomPassword = Math.random().toString(36).slice(-6); // e.g. "k3lp9z"

  setLobbyInputs(prev => ({
    ...prev,
    [tournamentId]: {
      ...prev[tournamentId],
      name: randomName,
      password: randomPassword,
    },
  }));
};

  if (!lobbyName || !lobbyPassword) {
    return alert('Lobby name and password are required');
  }

  let result = {};
  let res;

  try {
    res = await fetch('/api/tournaments/assign-lobby-auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId: id, lobbyName, lobbyPassword }),
    });

    try {
      result = await res.json();
    } catch {
      // JSON parse error — likely empty response, that's okay
    }

    if (res.ok) {
      alert('✅ Lobby assigned and players notified via Discord');
      setLobbyInputs(prev => ({ ...prev, [id]: { name: '', password: '' } }));
      setLobbyTournaments(prev => prev.filter(t => t.id !== id));
    } else {
      alert(`❌ Failed: ${result.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('❌ Network or server error:', err);
    alert('❌ Network or server error occurred.');
  }
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'maxSlots' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      ...form,
      currentSlots: 0, // ensure consistent structure
    };

    const res = await fetch('/api/tournaments/create', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      setError('Failed to create tournament');
    } else {
      setForm({
        name: '',
        type: '1v1',
        bracket: 'Herald',
        maxSlots: 8,
        prize: '',
        rules: '',
      });
      const updated = await fetch('/api/tournaments');
      setTournaments(await updated.json());
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    const res = await fetch(`/api/tournaments/delete?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTournaments(tournaments.filter((t) => t.id !== id));
    } else {
      alert('Failed to delete tournament');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!authUser) return <div className="p-6 text-red-600 font-bold">Access denied</div>;

  return (
    <div className="max-w-3xl mx-auto py-10">
        <div className="flex gap-4 mb-8">
  <button
    onClick={() => setActiveTab('tournaments')}
    className={`px-4 py-2 rounded ${activeTab === 'tournaments' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}
  >
    Manage Tournaments
  </button>
  <button
    onClick={() => setActiveTab('lobbies')}
    className={`px-4 py-2 rounded ${activeTab === 'lobbies' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}
  >
    Manage Lobbies
  </button>
</div>

      {activeTab === 'tournaments' && (
  <>
    <h1 className="text-2xl font-bold mb-6">Create New Tournament</h1>

    <form onSubmit={handleSubmit} className="space-y-4 mb-10">
      <input
        name="name"
        placeholder="Tournament Name"
        value={form.name}
        onChange={handleChange}
        className="w-full border px-4 py-2 rounded"
      />

      <select name="type" value={form.type} onChange={handleChange} className="w-full border px-4 py-2 rounded">
        <option value="1v1">1v1</option>
        <option value="5v5">5v5</option>
        <option value="turbo">Turbo</option>
      </select>

      <select name="bracket" value={form.bracket} onChange={handleChange} className="w-full border px-4 py-2 rounded">
        <option value="Herald">Herald</option>
        <option value="Guardian-Crusader">Guardian-Crusader</option>
        <option value="Archon-Legend">Archon-Legend</option>
        <option value="Ancient-Divine">Ancient-Divine</option>
        <option value="Immortal">Immortal</option>
      </select>

      <input
        name="maxSlots"
        type="number"
        placeholder="Max Slots"
        value={form.maxSlots}
        onChange={handleChange}
        className="w-full border px-4 py-2 rounded"
      />

      <input
        name="prize"
        placeholder="Prize"
        value={form.prize}
        onChange={handleChange}
        className="w-full border px-4 py-2 rounded"
      />

      <textarea
        name="rules"
        placeholder="Tournament Rules (optional)"
        value={form.rules}
        onChange={handleChange}
        className="w-full border px-4 py-2 rounded"
      />

      {error && <p className="text-red-600">{error}</p>}

      <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">
        Create Tournament
      </button>
    </form>

    <h2 className="text-xl font-bold mb-4">Existing Tournaments</h2>
    {tournaments.length === 0 && <p className="text-gray-600">No tournaments yet.</p>}
    <ul className="space-y-4">
      {tournaments.map((t) => (
        <li key={t.id} className="border p-4 rounded bg-white shadow flex justify-between items-center">
          <div>
            <p className="font-semibold">{t.name}</p>
            <p className="text-sm text-gray-600">
              {t.type.toUpperCase()} · {t.bracket} · {t.currentSlots}/{t.maxSlots} · Prize: {t.prize}
            </p>
            {t.rules && <p className="text-xs text-gray-500 mt-1">Rules: {t.rules}</p>}
          </div>
          <button
            onClick={() => handleDelete(t.id)}
            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  </>
)}
{activeTab === 'lobbies' && (
  <div>
    <h2 className="text-xl font-bold mb-4">Tournaments Ready for Lobby</h2>
    {lobbyTournaments.length === 0 ? (
      <p className="text-gray-600">No tournaments are ready yet.</p>
    ) : (
      <ul className="space-y-4">
        {lobbyTournaments.map((t) => (
          <li key={t.id} className="border p-4 rounded bg-white shadow space-y-2">
            <div className="text-black font-semibold">{t.name}</div>
            <div className="text-sm text-gray-600">
              {t.type.toUpperCase()} · {t.bracket} · {t.currentSlots}/{t.maxSlots}
            </div>
                {/* Show registered players for 1v1 */}
    {Array.isArray(t.playerObjects) && (
      <div className="text-sm text-gray-700 mt-2">
        <p className="font-semibold mb-1">Registered Players:</p>
        <ul className="list-disc list-inside">
          {t.playerObjects.map((p, i) => (
            <li key={i}>
              {p.username || p.name || p.steamId} — <span className="text-blue-800">{p.steamId}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Show registered teams for 5v5 or turbo */}
    {Array.isArray(t.teamObjects) && (
      <div className="text-sm text-gray-700 mt-2">
        <p className="font-semibold mb-1">Registered Teams:</p>
        {t.teamObjects.map((team, i) => (
          <div key={i} className="mb-2">
            <p className="font-semibold">Team {team.name || `#${i + 1}`}</p>
            <ul className="list-disc list-inside ml-4">
              {(team.players || []).map((p, j) => (
                <li key={j}>
                  {p.username || p.name || p.steamId} — <span className="text-blue-800">{p.steamId}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )}
            <div className="flex gap-2 mb-4">
  <input
    type="text"
    placeholder="Lobby name"
    value={lobbyInputs[t.id]?.name || ''}
    onChange={(e) => handleLobbyChange(t.id, 'name', e.target.value)}
    className="w-1/3 border p-2 rounded"
  />
  <input
    type="text"
    placeholder="Password"
    value={lobbyInputs[t.id]?.password || ''}
    onChange={(e) => handleLobbyChange(t.id, 'password', e.target.value)}
    className="w-1/3 border p-2 rounded"
  />
  <input
    type="text"
    placeholder="Server region (e.g. EU, NA)"
    value={lobbyInputs[t.id]?.region || ''}
    onChange={(e) => handleLobbyChange(t.id, 'region', e.target.value)}
    className="w-1/3 border p-2 rounded"
  />
</div>
<button
  onClick={() => generateLobbyInfo(t.id)}
  className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
>
  🎲 Generate Lobby Info
</button>



            <button
              onClick={() => assignLobby(t.id)}
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
            >
              Assign Lobby & Notify
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
)}
    </div>
  );
}
