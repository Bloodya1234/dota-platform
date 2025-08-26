// src/app/steam-login/SteamLoginClient.js
'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export default function SteamLoginClient() {
  const sp = useSearchParams();

  // Соберём те параметры, которые нужно сохранить при старте логина (если есть)
  const href = useMemo(() => {
    const qs = new URLSearchParams();
    const next = sp.get('next');
    const inviteTeam = sp.get('inviteTeam');
    if (next) qs.set('next', next);
    if (inviteTeam) qs.set('inviteTeam', inviteTeam);

    // ⚠️ Если у тебя другой стартовый эндпоинт — замени путь ниже на свой
    const base = '/api/steam/auth';
    return qs.toString() ? `${base}?${qs}` : base;
  }, [sp]);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Steam login</h1>
      <p style={{ marginBottom: 12 }}>
        Continue to sign in with Steam.
      </p>
      <a
        href={href}
        style={{ padding: '10px 14px', border: '1px solid #888', borderRadius: 8, display: 'inline-block' }}
      >
        Continue with Steam
      </a>
    </div>
  );
}
