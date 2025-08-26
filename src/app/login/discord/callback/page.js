// src/app/login/discord/callback/page.js
import { Suspense } from 'react';
import DiscordCallbackClient from './DiscordCallbackClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div>Completing Discord sign-in…</div>}>
      <DiscordCallbackClient />
    </Suspense>
  );
}
