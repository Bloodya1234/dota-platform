// src/app/team/page.js
import { Suspense } from 'react';
import TeamClient from './TeamClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

export default function Page() {
  return (
    <Suspense fallback={<div>Loading team…</div>}>
      <TeamClient />
    </Suspense>
  );
}
