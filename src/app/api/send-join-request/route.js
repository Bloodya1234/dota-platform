// src/app/api/send-join-request/route.js
import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK service account config
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Initialize Firebase app if not already initialized
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

export async function POST(req) {
  const { teamId, userId, userName } = await req.json();

  console.log('[Join Request] Incoming data:', { teamId, userId, userName });

  if (!teamId || !userId || !userName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    // Fetch team
    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const teamData = teamSnap.data();
    const captainId = teamData.captainId;
    if (!captainId) {
      return NextResponse.json({ error: 'Captain not assigned to team' }, { status: 400 });
    }

    // Fetch captain user
    const captainRef = db.collection('users').doc(captainId);
    const captainSnap = await captainRef.get();
    if (!captainSnap.exists) {
      return NextResponse.json({ error: 'Captain user not found' }, { status: 404 });
    }

    const captainData = captainSnap.data();
    const discordId = captainData.discord?.id;
    if (!discordId) {
      return NextResponse.json({ error: 'Captain does not have Discord connected' }, { status: 400 });
    }

    // Build the message
    const profileUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/profile/${userId}`;
    const message = `👋 User **${userName}** is requesting to join your team.\n\n🔗 [View player profile](${profileUrl})`;

    // Send message to bot server
    const botUrl = process.env.BOT_SERVER_URL || 'http://localhost:3001';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${botUrl}/send-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, message }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Bot server responded with error:', errorText);
      throw new Error('Bot message failed');
    }

    console.log('✅ Join request message sent to captain');

    // Add to Firestore joinRequests
    await teamRef.update({
      joinRequests: [
        ...(teamData.joinRequests || []),
        {
          id: userId,
          username: userName,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Join request error:', err);
    return NextResponse.json({ error: 'Failed to notify captain' }, { status: 500 });
  }
}
