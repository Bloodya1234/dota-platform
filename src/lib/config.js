cat > src/lib/config.js <<'EOF'
export const DISCORD_ADMIN_WEBHOOK = process.env.DISCORD_ADMIN_WEBHOOK || "";
export default { DISCORD_ADMIN_WEBHOOK };
EOF