import dotenv from 'dotenv';
dotenv.config(); // Load .env variables

import {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
} from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

let botStarted = false;

// ✅ Ensure bot is logged in
async function ensureBotLoggedIn() {
  if (!botStarted) {
    try {
      await client.login(process.env.DISCORD_BOT_TOKEN);
      console.log('✅ Bot logged in');
      botStarted = true;
    } catch (err) {
      console.error('❌ Failed to log in bot:', err);
      throw err;
    }
  }
}

// ✅ Send a DM to a user
export async function sendInviteDM(discordId, messageText) {
  await ensureBotLoggedIn();
  try {
    const user = await client.users.fetch(discordId);
    if (!user) throw new Error('User not found');
    await user.send(messageText);
    console.log(`📩 DM sent to ${user.tag}`);
  } catch (err) {
    console.error(`❌ Failed to send DM to ${discordId}:`, err);
    throw err;
  }
}

// ✅ Check if a user is already in the server
export async function isUserInGuild(discordId) {
  await ensureBotLoggedIn();
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  try {
    await guild.members.fetch(discordId);
    return true;
  } catch {
    return false;
  }
}

// ✅ Auto-invite user if not in server
export async function sendAutoServerInvite(discordId) {
  await ensureBotLoggedIn();

  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const channel = await guild.channels.fetch(process.env.DISCORD_INVITE_CHANNEL_ID);

  const invite = await channel.createInvite({
    maxUses: 1,
    unique: true,
    maxAge: 86400, // 1 day
    reason: `Auto invite for ${discordId}`,
  });

  const user = await client.users.fetch(discordId);
  const message = `📨 You are invited to the server **${guild.name}**.\n\n🔗 ${invite.url}`;
  await user.send(message);
  console.log(`📨 Auto-invite sent to ${user.tag}`);
}

// ✅ Create private text channel for a team
export async function createTeamChannel(teamName, memberDiscordIds) {
  await ensureBotLoggedIn();

  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  await guild.roles.fetch(); // Ensure roles are loaded into cache
const everyone = guild.roles.cache.get(guild.id);
if (!everyone) throw new Error('Unable to retrieve @everyone role');


  const botUser = client.user;

  // ✅ Only include users already in the server
  const validMembers = [];
  for (const id of memberDiscordIds) {
    try {
      const member = await guild.members.fetch(id);
      if (member) validMembers.push(id);
    } catch {
      console.warn(`⚠️ User ${id} is not in the server — skipping.`);
    }
  }

  const permissionOverwrites = [
    {
      id: everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
   {
  id: botUser.id, // ← the actual bot user ID
  allow: [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageRoles,
  ],
},

    ...validMembers.map(id => ({
      id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    })),
  ];
console.log(
  '🔐 Permissions to set:',
  JSON.stringify(permissionOverwrites, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v,
    2
  )
);


  const channel = await guild.channels.create({
    name: teamName.toLowerCase().replace(/\s+/g, '-'),
    type: ChannelType.GuildText,
    parent: process.env.DISCORD_CATEGORY_ID || undefined,
    permissionOverwrites,
  });

  console.log(`📺 Created channel ${channel.name} with ID ${channel.id}`);
  const channelUrl = `https://discord.com/channels/${guild.id}/${channel.id}`;
return channelUrl;
}

// ✅ Update channel permissions for current team members
export async function updateTeamChannelPermissions(channelId, memberDiscordIds) {
  await ensureBotLoggedIn();

  const channel = await client.channels.fetch(channelId);
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const everyone = guild.roles.cache.get(guild.id);
  const botUser = client.user;

  if (!channel || !everyone) throw new Error('Channel or @everyone role not found');

  // ✅ Only include users already in the server
  const validMembers = [];
  for (const id of memberDiscordIds) {
    try {
      const member = await guild.members.fetch(id);
      if (member) validMembers.push(id);
    } catch {
      console.warn(`⚠️ User ${id} is not in the server — skipping.`);
    }
  }

  await channel.permissionOverwrites.set([
    {
      id: everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: botUser.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageRoles,
      ],
    },
    ...validMembers.map(id => ({
      id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    })),
  ]);

  console.log(`🔄 Updated permissions for channel ${channel.id}`);
}

// ✅ Delete the team channel
export async function deleteTeamChannel(channelId) {
  await ensureBotLoggedIn();
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel) {
    await channel.delete();
    console.log(`🗑️ Deleted channel: ${channel.name}`);
  }
}

export {
  ensureBotLoggedIn,
  client,
};
client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log('📋 Servers this bot is in:');
  client.guilds.cache.forEach(guild => console.log(`- ${guild.name} (${guild.id})`));
});

