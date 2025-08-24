'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import Header from './Header';
import { app } from '@/firebase';

export default function ClientLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        router.push('/login');
        return;
      }

      const userData = userSnap.data();
      setUser(userData);

      const discordId = userData?.discord?.id;
      const alreadyJoined = userData?.joinedDiscordServer === true;

      if (!discordId && pathname !== '/connect-discord') {
        router.push('/connect-discord');
        setLoading(false);
        return;
      }

      if (discordId && !alreadyJoined) {
        try {
          const res = await fetch('http://localhost:3001/check-server-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId }),
          });

          const result = await res.json();

          if (res.ok && result.isMember === true) {
            await updateDoc(userRef, { joinedDiscordServer: true });
            setUser({ ...userData, joinedDiscordServer: true });
          } else {
            await fetch('http://localhost:3001/auto-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ discordId }),
            });
          }
        } catch (err) {
          console.error('Error checking Discord server membership:', err);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  if (loading) {
    return <div className="p-6 text-center text-primary">Checking permissions...</div>;
  }

  if (user?.discord?.id && !user?.joinedDiscordServer) {
    return (
      <div className="p-6 text-red-500 font-semibold text-center">
        ⚠️ You must join our Discord server to use the platform. Reload the page after joining.
        <br />
        <a
          href="https://discord.gg/xqUdNaG9"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-accent"
        >
          Click here to join manually
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary font-orbitron">
      {pathname !== '/connect-discord' && <Header />}

      {/* ✅ Remove max-w-7xl and allow overflow */}
      <main className="flex-grow w-full overflow-x-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
