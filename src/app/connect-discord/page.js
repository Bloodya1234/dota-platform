// src/app/connect-discord/page.js
import { Suspense } from 'react';
import ConnectDiscordClient from './ConnectDiscordClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div>Connecting Discord…</div>}>
      <ConnectDiscordClient />
    </Suspense>
  );
}
