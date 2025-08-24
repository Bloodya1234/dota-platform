import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8'),
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();
const db = getFirestore();

function steam64To32(steam64) {
  return String(BigInt(steam64) - BigInt('76561197960265728'));
}

export async function GET(req) {
  const url = new URL(req.nextUrl);
  const params = Object.fromEntries(url.searchParams.entries());

  console.log('🔍 Full incoming URL:', url.toString());
  console.log('🔎 openid.return_to:', params['openid.return_to']);
  console.log('🔎 openid.realm (should match return_to root):', 'https://localhost:3000/');

  // 🚨 Handle Steam OpenID failure
  if (params['openid.mode'] === 'error') {
    console.error('❌ Steam login error:', params['openid.error']);
    return NextResponse.json({ error: params['openid.error'] || 'Steam OpenID error' }, { status: 400 });
  }

  // 🚨 Handle missing required OpenID fields
  if (!params['openid.signed'] || !params['openid.assoc_handle'] || !params['openid.sig']) {
    return NextResponse.json({ error: 'Missing OpenID response parameters' }, { status: 400 });
  }

  // 1. Validate OpenID response with Steam
  const body = new URLSearchParams({
    'openid.assoc_handle': params['openid.assoc_handle'],
    'openid.signed': params['openid.signed'],
    'openid.sig': params['openid.sig'],
    'openid.ns': 'http://specs.openid.net/auth/2.0',
  });

  try {
    for (const field of params['openid.signed'].split(',')) {
      body.set(`openid.${field}`, params[`openid.${field}`]);
    }
  } catch (err) {
    console.error('❌ Failed to parse signed OpenID fields:', err);
    return NextResponse.json({ error: 'Invalid OpenID signed fields' }, { status: 400 });
  }

  console.log('📦 Body sent to Steam OpenID endpoint:');
  console.log(body.toString());

  const steamRes = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const responseText = await steamRes.text();
  console.log('📥 Steam OpenID verification response:');
  console.log(responseText);

  if (!responseText.includes('is_valid:true')) {
    console.error('❌ Steam login verification failed');
    return NextResponse.json({ error: 'Steam login verification failed' }, { status: 400 });
  }

  // 2. Extract SteamID
  const claimedId = params['openid.claimed_id'];
  const steamID64 = claimedId?.split('/').pop();
  const steamId32 = steam64To32(steamID64);
  const firebaseUID = `steam:${steamID64}`;

  // 3. Fetch Steam profile
  let displayName = 'Steam User';
  let avatar = '';
  try {
    const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamID64}`;
    const res = await fetch(steamApiUrl);
    const data = await res.json();
    const player = data.response?.players?.[0];

    if (player) {
      displayName = player.personaname || displayName;
      avatar = player.avatarfull || avatar;
    }
  } catch (err) {
    console.warn('⚠️ Failed to fetch Steam profile:', err);
  }

  // 4. Fetch top heroes
  let topHeroes = [];
  try {
    const res = await fetch(`https://api.opendota.com/api/players/${steamId32}/heroes`);
    const data = await res.json();
    topHeroes = (Array.isArray(data) ? data : [])
      .sort((a, b) => b.games - a.games)
      .slice(0, 3)
      .map((h) => h.hero_id);
  } catch (err) {
    console.warn('⚠️ Could not fetch most played heroes');
  }

  // 5. Create or update Firebase user
  const inviteTeam = url.searchParams.get('inviteTeam');
  const invites = inviteTeam
    ? { incoming: [inviteTeam], outgoing: [] }
    : { incoming: [], outgoing: [] };

  const userRef = db.collection('users').doc(firebaseUID);
  const userDoc = await userRef.get();

  const baseUser = {
    steamId: firebaseUID,
    steamId64,
    steamId32,
    name: displayName,
    avatar,
    language: 'en',
    mmr: { solo: null, party: null },
    winRate: null,
    mostPlayedHeroes: topHeroes,
    matches: [],
    invites,
    team: null,
    teamId: null,
    discord: {},
    openForInvites: true,
  };

  if (!userDoc.exists) {
    await userRef.set(baseUser);
  } else {
    await userRef.update({
      name: displayName,
      avatar,
      steamId64,
      steamId32,
      mostPlayedHeroes: topHeroes,
      ...(inviteTeam && { invites }),
    });
  }

  const token = await auth.createCustomToken(firebaseUID);

  // 6. Redirect to frontend with session storage and token
  const redirectHtml = `
    <html>
      <head><script>
        sessionStorage.setItem("steamId", "${firebaseUID}");
        sessionStorage.setItem("token", "${token}");
        ${inviteTeam ? `sessionStorage.setItem("inviteTeam", "${inviteTeam}");` : ''}
        window.location.href = "/steam-login";
      </script></head>
      <body>Redirecting...</body>
    </html>
  `;

  return new NextResponse(redirectHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}
