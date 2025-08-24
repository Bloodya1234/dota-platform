// src/app/api/send-invite/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { recipientDiscordId, teamName, inviteLink } = await req.json();

  if (!recipientDiscordId || !teamName || !inviteLink) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const res = await fetch('http://localhost:3001/send-dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: recipientDiscordId,
        message: `You have been invited to the team **${teamName}**. Join here: ${inviteLink}`
      })
    });

    if (!res.ok) throw new Error('Bot server error');
    return NextResponse.json({ message: 'Invite sent' });
  } catch (err) {
    console.error('Error sending Discord invite:', err);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
