// src/app/tournaments/page.js
import { Suspense } from 'react';
import TournamentsClient from './TournamentsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

export default function Page() {
  return (
    <Suspense fallback={<div>Loading tournaments…</div>}>
      <TournamentsClient />
    </Suspense>
  );
}
