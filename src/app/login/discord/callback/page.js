'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DiscordCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      console.error('❌ Missing code or state');
      router.push('/login');
      return;
    }

    // Redirect browser to API (NOT fetch!)
    window.location.href = `/api/discord/callback?code=${encodeURIComponent(
      code
    )}&state=${encodeURIComponent(state)}`;
  }, [searchParams, router]);

  return <p className="text-center p-6">Authorizing Discord...</p>;
}
