// src/app/login/discord/DiscordLoginClient.js
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DiscordLoginClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Если у тебя на этой странице была логика — перенеси её сюда.
  // Пример: чтение redirect и показ кнопки/редирект на свой API-роут авторизации.

  useEffect(() => {
    // пример: если хочешь авто-редиректить сразу на свой старт авторизации
    // router.replace('/api/discord/auth'); // <-- поставь свой реальный стартовый роут, если он есть
  }, [router, searchParams]);

  const next = searchParams.get('next') || '/';

  return (
    <div style={{padding:16}}>
      <h1 style={{fontSize:20, marginBottom:8}}>Discord login</h1>
      <p style={{marginBottom:12}}>
        Continue to sign in with Discord.
      </p>
      {/* Если у тебя есть стартовый роут авторизации — замени href ниже */}
      <a href="/api/discord/auth" style={{padding:'10px 14px', border:'1px solid #888', borderRadius:8}}>
        Continue
      </a>
      <p style={{marginTop:10, fontSize:12, color:'#666'}}>After login you’ll be redirected to: {next}</p>
    </div>
  );
}
