// src/app/page.js
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  redirect('/login');
}
