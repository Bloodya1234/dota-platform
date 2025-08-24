'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/firebase';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const [inviteCount, setInviteCount] = useState(0);
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const fetchInviteCount = async () => {
      const auth = getAuth(app);
      const db = getFirestore(app);

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const invites = userData?.invites || [];
            setInviteCount(invites.length);
          }
        }
      });
    };

    fetchInviteCount();
  }, []);

  const languages = ['en', 'ru'];

  return (
    <header className="sticky top-0 z-50 bg-background/90 border-b border-accent shadow-[0_0_10px_#00ffe5] backdrop-blur-md">
      <div className="w-full px-6 md:px-12 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="CyberStars Logo"
            width={220}
            height={60}
            priority
            className="object-contain"
          />
        </Link>

        {/* Nav */}
        <nav className="flex gap-6 text-sm md:text-base text-accent uppercase tracking-wide items-center">
          <Link href="/profile" className="nav-link">Profile</Link>
          <Link href="/find" className="nav-link">Find</Link>
          <Link href="/tournaments" className="nav-link">Tournaments</Link>
          <Link href="/team" className="nav-link">Team</Link>
        </nav>

        {/* Language Switcher */}
        {mounted && (
          <div className="flex gap-2 text-xs">
            {languages.map((lng) => (
              <button
                key={lng}
                onClick={() => i18n.changeLanguage(lng)}
                className={`px-3 py-1 rounded border font-medium uppercase transition ${
                  i18n.language === lng
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-gray-800 border-gray-300'
                }`}
              >
                {lng.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
