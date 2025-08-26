// src/app/steam-login/page.js
import { Suspense } from 'react';
import SteamLoginClient from './SteamLoginClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div>Redirecting to Steam…</div>}>
      <SteamLoginClient />
    </Suspense>
  );
}
