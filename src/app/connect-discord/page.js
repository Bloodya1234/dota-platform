'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export default function ConnectDiscordPage() {
  const [steamId, setSteamId] = useState(null);
  const [token, setToken] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedSteamId = sessionStorage.getItem('steamId');
    const storedToken = sessionStorage.getItem('token');
    setSteamId(storedSteamId);
    setToken(storedToken);

    if (!storedToken) return;

    // ✅ 1. Sign in to Firebase
    signInWithCustomToken(auth, storedToken)
      .then(async (res) => {
        // ✅ 2. Get a fresh ID token
        const idToken = await res.user.getIdToken();

        // ✅ 3. Send token to server to set session cookie
        const response = await fetch('/api/sessionLogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
          credentials: 'include', // 🔐 Required for cookie
        });

        if (!response.ok) {
          console.error('❌ Failed to create session cookie');
          return;
        }

        // ✅ 4. Check if Discord is already connected
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
  }, [router]);

  const handleConnectDiscord = () => {
    if (!steamId || !token) return;

    const state = btoa(JSON.stringify({ steamId, token }));
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI)}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;

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
