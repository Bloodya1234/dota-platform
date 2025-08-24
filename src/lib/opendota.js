cat > src/lib/opendota.js <<'EOF'
export async function fetchOpenDotaStats(steamId) {
  if (!steamId) return { ok: false, error: "missing steamId" };
  const res = await fetch(`https://api.opendota.com/api/players/${steamId}`, { cache: "no-store" });
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();
  return { ok: true, data };
}
export default { fetchOpenDotaStats };
EOF