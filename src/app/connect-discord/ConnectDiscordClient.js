'use client';

// src/app/connect-discord/ConnectDiscordClient.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/firebase';

export default function ConnectDiscordClient() {
  const router = useRouter();
  const [steamId, setSteamId] = useState(null);
  const [token, setToken] = useState(null);

  // Инициализация Web SDK — только на клиенте
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    const storedSteamId = sessionStorage.getItem('steamId');
    const storedToken = sessionStorage.getItem('token');
    setSteamId(storedSteamId);
    setToken(storedToken);

    if (!storedToken) return;

    // 1) Firebase sign-in по кастомному токену
    signInWithCustomToken(auth, storedToken)
      .then(async (res) => {
        // 2) Берём свежий ID token
        const idToken = await res.user.getIdToken();

        // 3) Отправляем на сервер для установки session cookie
        const response = await fetch('/api/sessionLogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('❌ Failed to create session cookie');
          return;
        }

        // 4) Проверяем, подключён ли уже Discord
        const userRef = doc(db, 'users', res.user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.discord?.id) {
            router.push('/profile');
            return;
          }
        }
      })
      .catch((err) => {
        console.error('❌ Firebase sign-in failed:', err);
      });
  }, [auth, db, router]);

  const handleConnectDiscord = () => {
    if (!steamId || !token) return;

    const state = btoa(JSON.stringify({ steamId, token }));
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    // подстрахуемся, если переменная не задана в Vercel:
    const redirectUri =
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ||
      `${window.location.origin}/api/discord/callback`;

    if (!clientId) {
      console.error('❌ NEXT_PUBLIC_DISCORD_CLIENT_ID is missing');
      return;
    }

    const discordAuthUrl =
      `https://discord.com/oauth2/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=identify` +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = discordAuthUrl;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
      <h1 className="text-xl font-semibold">Connect your Discord</h1>
      <p className="text-gray-600 max-w-md">
        Connect your Discord account to receive invites to teams and tournaments.
      </p>
      <button
        onClick={handleConnectDiscord}
        className="px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Connect Discord
      </button>
    </div>
  );
}
