const config = {
  DISCORD_ADMIN_WEBHOOK: process.env.DISCORD_ADMIN_WEBHOOK || '',
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',
  BOT_SERVER_URL: process.env.BOT_SERVER_URL || '',
};

export default config;
export const { DISCORD_ADMIN_WEBHOOK, NEXT_PUBLIC_BASE_URL, BOT_SERVER_URL } = config;
