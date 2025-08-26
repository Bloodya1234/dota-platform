// src/app/login/discord/page.js
import { Suspense } from 'react';
import DiscordLoginClient from './DiscordLoginClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div>Redirecting to Discord…</div>}>
      <DiscordLoginClient />
    </Suspense>
  );
}
