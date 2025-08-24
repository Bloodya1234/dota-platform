import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

export async function GET(req) {
  const url = new URL(req.url);
  console.log('🔁 Discord callback URL:', url.toString());

  const code = url.searchParams.get('code');
  const stateEncoded = url.searchParams.get('state');

  if (!code || !stateEncoded) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  let steamId, token;
  try {
    const stateObj = JSON.parse(atob(stateEncoded));
    steamId = stateObj.steamId;
    token = stateObj.token;

    if (!steamId || !token) {
      throw new Error('Missing steamId or token in state');
    }
  } catch (err) {
    console.error('🔴 Invalid state:', err);
    return NextResponse.json({ error: 'Invalid state', message: err.message }, { status: 400 });
  }

  try {
    // Exchange code for access token
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    });

    const discordRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const discordData = await discordRes.json();
    console.log('🔍 Discord Token Response:', discordData);

    if (!discordRes.ok || !discordData.access_token) {
      return NextResponse.json({ error: 'Token exchange failed', details: discordData }, { status: 500 });
    }

    const accessToken = discordData.access_token;

    // Fetch Discord user
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const discordUser = await userRes.json();
    console.log('👤 Discord User:', discordUser);

    if (!discordUser.id || !discordUser.username) {
      return NextResponse.json({ error: 'Invalid Discord user response', details: discordUser }, { status: 500 });
    }

    const discordTag = `${discordUser.username}#${discordUser.discriminator}`;
    const docId = steamId.startsWith('steam:') ? steamId : `steam:${steamId}`;

    // Save Discord info to Firestore
    await db.collection('users').doc(docId).set({
      discord: {
        id: discordUser.id,
        tag: discordTag,
        avatar: discordUser.avatar,
      },
      joinedDiscordServer: false,
    }, { merge: true });

    // ✅ Trigger bot to auto-invite user to Discord server
    try {
      const botRes = await fetch(`${process.env.BOT_SERVER_URL}/auto-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: discordUser.id }),
      });

      const inviteResult = await botRes.json();
      console.log('🤖 Auto-invite response:', inviteResult);

      if (!botRes.ok) {
        console.warn('⚠️ Bot server responded with error:', inviteResult);
      }
    } catch (inviteErr) {
      console.error('❌ Failed to contact bot server for invite:', inviteErr);
    }

    return NextResponse.redirect('https://localhost:3000/profile');
  } catch (err) {
    console.error('🚨 Discord OAuth error:', err);
    return NextResponse.json({
      error: 'Discord OAuth failed',
      message: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}
