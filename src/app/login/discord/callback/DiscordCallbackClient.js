// src/app/login/discord/callback/DiscordCallbackClient.js
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DiscordCallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code) {
      // нет кода — отправим на обычный логин
      router.replace('/login/discord');
      return;
    }
    // передаём управление серверному API-роуту
    const qs = new URLSearchParams({ code, ...(state ? { state } : {}) });
    window.location.replace(`/api/discord/callback?${qs.toString()}`);
  }, [searchParams, router]);

  return <div>Completing Discord sign-in…</div>;
}
