// /app/api/steam/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  const redirectUrl =
    'https://steamcommunity.com/openid/login' +
    '?openid.ns=http://specs.openid.net/auth/2.0' +
    '&openid.mode=checkid_setup' +
    '&openid.return_to=https://localhost:3000/api/steam/return' +   // 🔁 back to HTTP
    '&openid.realm=https://localhost:3000/' +                        // 🔁 back to HTTP
    '&openid.identity=http://specs.openid.net/auth/2.0/identifier_select' +
    '&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select';

  return NextResponse.redirect(redirectUrl);
}
