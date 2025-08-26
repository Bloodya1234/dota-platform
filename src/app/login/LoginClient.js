// src/app/login/LoginClient.js
'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export default function LoginClient() {
  const sp = useSearchParams();

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    const next = sp.get('next');
    const inviteTeam = sp.get('inviteTeam');
    if (next) qs.set('next', next);
    if (inviteTeam) qs.set('inviteTeam', inviteTeam);
    return qs.toString();
  }, [sp]);

  // Ссылки на наши уже починенные страницы-лендинги логина
  const discordHref = useMemo(
    () => (query ? `/login/discord?${query}` : '/login/discord'),
    [query]
  );
  const steamHref = useMemo(
    () => (query ? `/steam-login?${query}` : '/steam-login'),
    [query]
  );

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '40px auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Sign in</h1>
      <p style={{ marginBottom: 20, color: '#555' }}>
        Choose a provider to continue.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a
          href={discordHref}
          style={{
            padding: '10px 14px',
            border: '1px solid #5865F2',
            color: '#fff',
            background: '#5865F2',
            borderRadius: 8,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Continue with Discord
        </a>

        <a
          href={steamHref}
          style={{
            padding: '10px 14px',
            border: '1px solid #171A21',
            color: '#fff',
            background: '#171A21',
            borderRadius: 8,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Continue with Steam
        </a>
      </div>
    </div>
  );
}
