// src/app/find/page.js
import { Suspense } from 'react';
import FindClient from './FindClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

export default function Page() {
  return (
    <Suspense fallback={<div>Loading search…</div>}>
      <FindClient />
    </Suspense>
  );
}
