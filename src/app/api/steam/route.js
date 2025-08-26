// /app/api/steam/route.js
import { NextResponse } from 'next/server';

export async function GET() {
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; // например: https://dota-platform-cyberstars.vercel.app

const steamAuthUrl =
  'https://steamcommunity.com/openid/login?' +
  'openid.ns=http://specs.openid.net/auth/2.0' +
  '&openid.mode=checkid_setup' +
  '&openid.identity=http://specs.openid.net/auth/2.0/identifier_select' +
  '&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select' +
  `&openid.return_to=${baseUrl}/api/steam/return` +
  `&openid.realm=${baseUrl}/`;


  return NextResponse.redirect(redirectUrl);
}
