'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { app } from '@/firebase'; // adjust the path if needed

export default function DiscordLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const steamId = searchParams.get('steamId');
    const token = searchParams.get('token');

    if (!steamId || !token) {
      console.error('❌ Missing steamId or token');
      router.push('/login');
      return;
    }

    // Sign in with Firebase custom token
    const auth = getAuth(app);
    signInWithCustomToken(auth, token)
      .then(() => {
        console.log('✅ Firebase signed in with custom token');
      })
      .catch((error) => {
        console.error('❌ Firebase sign-in failed:', error);
        router.push('/login');
      });

    const state = btoa(JSON.stringify({ steamId, token }));
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;

    const connectButton = document.getElementById('connect-discord-btn');
    if (connectButton) {
      connectButton.onclick = () => {
        window.location.href = discordAuthUrl;
      };
    }
  }, [searchParams, router]);

  return (
    <ClientLayout>
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <h1 className="text-xl font-semibold">Connect your Discord</h1>
        <p className="text-gray-600 max-w-md">
          Connect your Discord account to receive invites to teams and tournaments.
        </p>
        <button
          id="connect-discord-btn"
          className="px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Connect Discord
        </button>
      </div>
    </ClientLayout>
  );
}
