// src/app/tournaments/TournamentsClient.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TournamentsClient() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr('');
      try {
        // используем наш API-роут, чтобы не тянуть Firebase SDK в браузер
        const res = await fetch('/api/tournaments', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load tournaments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="max-w-5xl mx-auto p-6">Loading tournaments…</div>;
  if (err) return <div className="max-w-5xl mx-auto p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Tournaments</h1>

      {items.length === 0 ? (
        <div className="text-gray-600">No tournaments yet.</div>
      ) : (
        <div className="grid gap-4">
          {items.map((t) => (
            <div key={t.id} className="border rounded p-4 bg-white">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <Link href={`/tournaments/${t.id}`} className="text-lg font-semibold text-blue-600 hover:underline">
                    {t.name || 'Untitled tournament'}
                  </Link>
                  <div className="text-sm text-gray-600 mt-1">
                    {t.type ? `Type: ${t.type}` : null}
                    {t.bracket ? ` • Bracket: ${t.bracket}` : null}
                  </div>
                  {typeof t.currentSlots === 'number' && typeof t.maxSlots === 'number' && (
                    <div className="text-sm text-gray-600 mt-1">
                      Slots: {t.currentSlots}/{t.maxSlots} {t.isLocked ? '• Locked' : ''}
                    </div>
                  )}
                </div>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
