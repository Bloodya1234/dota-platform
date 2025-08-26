// src/app/login/page.js
import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div>Loading login…</div>}>
      <LoginClient />
    </Suspense>
  );
}
