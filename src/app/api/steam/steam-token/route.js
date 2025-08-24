// /src/app/api/steam-token/route.js

import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function POST(req) {
  try {
    const { steamId } = await req.json();

    if (!steamId) {
      return new Response(JSON.stringify({ error: 'Missing steamId' }), {
        status: 400,
      });
    }

    const token = await getAuth().createCustomToken(`steam:${steamId}`);

    return new Response(JSON.stringify({ token }), { status: 200 });
  } catch (error) {
    console.error('Error creating custom token:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
