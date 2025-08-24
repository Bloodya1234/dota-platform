'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { auth, app } from '@/firebase';

const db = getFirestore(app);

export default function SteamLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Logging in with Steam...');
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const steamId = searchParams.get('steamId');
    const name = searchParams.get('name') || 'Steam User';
    const avatarUrl = searchParams.get('avatar');
    const discord = searchParams.get('discord');

    if (!token || !steamId) {
      setStatus('❌ Missing token or steamId');
      return;
    }

    signInWithCustomToken(auth, token)
      .then(async (userCredential) => {
        setStatus(`✅ Logged in as ${name}`);
        if (avatarUrl) setAvatar(avatarUrl);

        const idToken = await userCredential.user.getIdToken();

        // Send token to create session cookie
        const res = await fetch('/api/sessionLogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Session cookie creation failed');

        // Optional: Save Discord
        if (discord) {
          try {
            const userRef = doc(db, 'users', `steam:${steamId}`);
            await updateDoc(userRef, { discord });
          } catch (err) {
            console.error('Error saving Discord:', err);
          }
        }

        setTimeout(() => {
          router.push('/connect-discord'); // or /profile
        }, 1000);
      })
      .catch((err) => {
        console.error('Login failed:', err);
        setStatus('❌ Firebase login failed');
      });
  }, [searchParams, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStatus('👋 Logged out');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      setStatus('❌ Logout failed');
    }
  };

  return (
    <div className="text-center p-6">
      <h2 className="text-xl font-semibold mb-2">{status}</h2>
      {avatar && (
        <img
          src={avatar}
          alt="Steam Avatar"
          className="rounded-full mx-auto mb-4"
          width={100}
          height={100}
        />
      )}
      <button
        onClick={handleLogout}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}
