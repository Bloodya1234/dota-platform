// bot/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {
  sendInviteDM,
  sendAutoServerInvite,
  isUserInGuild,
  ensureBotLoggedIn,
  client,
} from '../src/bot/bot.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// ✅ Manual invite for a specific team
app.post('/send-dm', async (req, res) => {
  const { discordId, message } = req.body;
  console.log('📨 Received DM request for Discord ID:', discordId);

  try {
    await sendInviteDM(discordId, message);
    console.log(`✅ Successfully sent DM to ${discordId}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Bot failed to send DM:', err);
    res.status(500).json({
      error: 'Failed to send invite',
      details: err.message || 'Unknown error',
    });
  }
});
// ✅ Bulk DM sender for lobby assignment
app.post('/send-dm-batch', async (req, res) => {
  const { tournamentName, lobbyName, lobbyPassword, players } = req.body;

  if (!Array.isArray(players)) {
    return res.status(400).json({ error: 'Missing or invalid players array' });
  }

  const results = [];

  for (const player of players) {
    if (!player?.discordId) continue;

    const msg = `🎮 Your match for **${tournamentName}** is ready!\n\n🧩 Lobby Name: \`${lobbyName}\`\n🔐 Password: \`${lobbyPassword}\``;

    try {
      await sendInviteDM(player.discordId, msg);
      console.log(`✅ DM sent to ${player.username || player.discordId}`);
      results.push({ user: player.username || player.discordId, success: true });
    } catch (err) {
      console.error(`❌ Failed to send DM to ${player.username || player.discordId}:`, err.message);
      results.push({ user: player.username || player.discordId, success: false, error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    count: results.length,
    details: results,
  });
});


// ✅ Auto-invite when user logs in
app.post('/auto-invite', async (req, res) => {
  const { discordId } = req.body;

  if (!discordId) {
    return res.status(400).json({ error: 'Missing discordId' });
  }

  try {
    const alreadyInServer = await isUserInGuild(discordId);
    if (!alreadyInServer) {
      await sendAutoServerInvite(discordId);
      return res.status(200).json({ invited: true });
    } else {
      return res.status(200).json({ invited: false, reason: 'User already in server' });
    }
  } catch (err) {
    console.error('❌ Auto-invite error:', err);
    return res.status(500).json({ error: 'Failed to auto-invite user' });
  }
});

// ✅ Check if user is in the server
app.post('/check-server-membership', async (req, res) => {
  const { discordId } = req.body;

  if (!discordId) {
    return res.status(400).json({ error: 'Missing discordId' });
  }

  try {
    await ensureBotLoggedIn();
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const member = await guild.members.fetch(discordId).catch(() => null);

    if (member) {
      return res.json({ isMember: true });
    } else {
      return res.json({ isMember: false });
    }
  } catch (err) {
    console.error('❌ Membership check failed:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ✅ Start the bot server
app.listen(PORT, () => {
  console.log(`🚀 Discord bot server running at http://localhost:${PORT}`);
});

import {
  createTeamChannel,
  updateTeamChannelPermissions,
  deleteTeamChannel,
} from '../src/bot/bot.js';

// 🔧 Create a team channel
app.post('/team/create-channel', async (req, res) => {
  const { teamName, memberDiscordIds, discordId } = req.body;
  if (!teamName || !Array.isArray(memberDiscordIds) || !discordId) {
    return res.status(400).json({ error: 'Missing teamName, memberDiscordIds, or discordId' });
  }

  try {
    const channelUrl = await createTeamChannel(teamName, memberDiscordIds);

    await sendInviteDM(discordId, `📺 Your private team channel is ready!\n\n🔗 ${channelUrl}`);

    return res.status(200).json({ success: true, channelUrl });
  } catch (err) {
    console.error('❌ Failed to create team channel:', err);
    return res.status(500).json({ error: 'Channel creation failed' });
  }
});

// 🔄 Update permissions
app.post('/team/update-channel', async (req, res) => {
  const { channelId, memberDiscordIds } = req.body;
  if (!channelId || !Array.isArray(memberDiscordIds)) {
    return res.status(400).json({ error: 'Missing channelId or memberDiscordIds' });
  }

  try {
    await updateTeamChannelPermissions(channelId, memberDiscordIds);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Failed to update team channel:', err);
    return res.status(500).json({ error: 'Channel update failed' });
  }
});

// 🗑️ Delete channel
app.post('/team/delete-channel', async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) {
    return res.status(400).json({ error: 'Missing channelId' });
  }

  try {
    await deleteTeamChannel(channelId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Failed to delete team channel:', err);
    return res.status(500).json({ error: 'Channel deletion failed' });
  }
});
