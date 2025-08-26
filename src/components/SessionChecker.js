'use client';

import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '@/firebase';

export default function SessionChecker() {
  useEffect(() => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;

      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;
      const userData = userSnap.data();

      const discordId = userData?.discord?.id;
      const alreadyJoined = userData?.joinedDiscordServer === true;

      if (discordId && !alreadyJoined) {
        try {
          const res = await fetch(`${process.env.BOT_SERVER_URL}/check-server-membership`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId }),
          });

          const result = await res.json();

          if (res.ok && result.isMember === true) {
            await updateDoc(userRef, { joinedDiscordServer: true });
            console.log('✅ Updated Firestore: user is in Discord server');
          } else {
           await fetch(`${process.env.BOT_SERVER_URL}/auto-invite`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ discordId }),
            });
            console.log('📨 Re-invite sent to user');
          }
        } catch (err) {
          console.error('🔴 Error checking server membership:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
