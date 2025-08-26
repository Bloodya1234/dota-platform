const API_BASE = 'https://api.opendota.com/api';

export async function fetchOpenDotaStats(steamId32) {
  const [wlRes, profileRes] = await Promise.all([
    fetch(`${API_BASE}/players/${steamId32}/wl`, { cache: 'no-store' }),
    fetch(`${API_BASE}/players/${steamId32}`, { cache: 'no-store' }),
  ]);
  return {
    wl: await wlRes.json(),
    profile: await profileRes.json(),
  };
}
