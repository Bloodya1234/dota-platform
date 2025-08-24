// src/app/my-team/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  getFirestore, serverTimestamp,
} from 'firebase/firestore';
import { app } from '@/firebase';
import ClientLayout from '@/components/ClientLayout';
import { v4 as uuidv4 } from 'uuid';

const auth = getAuth(app);
const db = getFirestore(app);
const POSITIONS = ['Carry', 'Mid lane', 'Offlane', 'Support', 'Hard Support'];

async function fetchWinRateAndRank(uid) {
  try {
    const steamId32 = BigInt(uid.replace('steam:', '')) - BigInt('76561197960265728');
    const [wlRes, profileRes] = await Promise.all([
      fetch(`https://api.opendota.com/api/players/${steamId32}/wl`),
      fetch(`https://api.opendota.com/api/players/${steamId32}`),
    ]);
    const [wlData, profileData] = await Promise.all([wlRes.json(), profileRes.json()]);
    const win = wlData.win || 0;
    const lose = wlData.lose || 0;
    const winRate = win + lose > 0 ? Math.round((win / (win + lose)) * 100) : 'N/A';

    const rankTier = profileData.rank_tier;
    let rank = 'Unranked';
    if (rankTier) {
      const names = { 1: 'Herald', 2: 'Guardian', 3: 'Crusader', 4: 'Archon', 5: 'Legend', 6: 'Ancient', 7: 'Divine', 8: 'Immortal' };
      const tier = Math.floor(rankTier / 10);
      const division = rankTier % 10;
      rank = `${names[tier] || 'Unknown'}${tier < 8 ? ` ${division}` : ''}`;
    }

    return { winRate, rank };
  } catch {
    return { winRate: 'N/A', rank: 'Unranked' };
  }
}

export default function TeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCaptain, setIsCaptain] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [pendingInviteTeam, setPendingInviteTeam] = useState(null);
  const [invitePromptVisible, setInvitePromptVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);

 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) return router.push('/login');

    let inviteId = searchParams.get('inviteTeam');

if (!inviteId && typeof window !== 'undefined') {
  inviteId = sessionStorage.getItem('inviteTeam');
}

if (inviteId && typeof window !== 'undefined') {
  sessionStorage.setItem('inviteTeam', inviteId);
}
let inviteTeamId = searchParams.get('inviteTeam');
if (!inviteTeamId && typeof window !== 'undefined') {
  inviteTeamId = sessionStorage.getItem('inviteTeam');
}

    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return setLoading(false);

    const userData = userSnap.data();

    // Save invite to Firestore if not already present
    if (
      inviteTeamId &&
      (!userData.invites || !userData.invites.incoming?.includes(inviteTeamId))
    ) {
      await updateDoc(userRef, {
        invites: { incoming: [inviteTeamId] },
      });
      userData.invites = { incoming: [inviteTeamId] };
    }

    const userInviteTeamId = inviteTeamId || userData.invites?.incoming?.[0] || null;
    console.log('🔍 userInviteTeamId:', userInviteTeamId);
console.log('👤 userData:', userData);


    setUser({ ...userData, uid: firebaseUser.uid });

    // === TEAM HANDLING ===
    if (userData.teamId) {
      const teamRef = doc(db, 'teams', userData.teamId);
      const teamSnap = await getDoc(teamRef);

      if (!teamSnap.exists()) {
        console.warn('Team not found. Cleaning up teamId...');
        await updateDoc(userRef, { teamId: null, team: null });
        setTeam(null);

        // ✅ Fallback to invite
        if (userInviteTeamId) {
          const inviteTeamRef = doc(db, 'teams', userInviteTeamId);
          const inviteTeamSnap = await getDoc(inviteTeamRef);
          if (inviteTeamSnap.exists()) {
            setPendingInviteTeam({ id: userInviteTeamId, ...inviteTeamSnap.data() });
            setInvitePromptVisible(true);
            sessionStorage.removeItem('inviteTeam');
          }
        }

        return;
      }

      const teamData = teamSnap.data();
      const members = Array.isArray(teamData.members) ? teamData.members : [];
      const memberIds = Array.isArray(teamData.memberIds) ? teamData.memberIds : [];

      const updatedMembers = await Promise.all(
        members.map(async (m) => {
          if (!m.winRate || !m.rank) {
            const { winRate, rank } = await fetchWinRateAndRank(m.id);
            return { ...m, winRate, rank };
          }
          return m;
        })
      );

      await updateDoc(teamRef, { members: updatedMembers });

      setTeam({
        id: teamSnap.id,
        ...teamData,
        members: updatedMembers,
        memberIds,
      });

      setIsCaptain(teamData.captainId === firebaseUser.uid);
      setInviteLink(`${window.location.origin}/login?inviteTeam=${teamSnap.id}`);
      setJoinRequests(Array.isArray(teamData.joinRequests) ? teamData.joinRequests : []);

    } else if (userInviteTeamId) {
  try {
    const inviteTeamRef = doc(db, 'teams', userInviteTeamId);
    const inviteTeamSnap = await getDoc(inviteTeamRef);
console.log('📩 Found invite team:', inviteTeamSnap.data());
    if (inviteTeamSnap.exists()) {
      setPendingInviteTeam({ id: userInviteTeamId, ...inviteTeamSnap.data() });
      setInvitePromptVisible(true);

      // 🔐 Clear sessionStorage to avoid repeat
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('inviteTeam');
      }
    } else {
      console.warn('⚠️ Team not found for inviteTeamId:', userInviteTeamId);
    }
  } catch (err) {
    console.error('❌ Failed to fetch team for inviteTeamId:', err);
  }
}


    setLoading(false);
  });

  return () => unsubscribe();
}, [router, searchParams]);


  const handleAcceptJoinRequest = async (request) => {
    if (!team || !request?.id) return;

    const userRef = doc(db, 'users', request.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const { winRate, rank } = await fetchWinRateAndRank(request.id);

    const newMember = {
      id: request.id,
      username: userData.name || 'Player',
      avatar: userData.avatar || '',
      role: 'member',
      position: '',
      rank,
      winRate,
    };

    const updatedMembers = [...team.members, newMember];
    const updatedJoinRequests = joinRequests.filter(r => r.id !== request.id);
    const updatedMemberIds = [...team.memberIds, request.id];

    try {
      await updateDoc(doc(db, 'teams', team.id), {
        members: updatedMembers,
        memberIds: updatedMemberIds,
        joinRequests: updatedJoinRequests,
      });
      console.log('✅ Team updated successfully');
    } catch (err) {
      console.error('❌ Failed to update team:', err);
    }
// Get all current Discord IDs
const memberDiscordIds = [];
for (const m of updatedMembers) {
  const mDoc = await getDoc(doc(db, 'users', m.id));
  const mDiscordId = mDoc.exists() ? mDoc.data().discord?.id : null;
  if (mDiscordId) memberDiscordIds.push(mDiscordId);
}

if (team.discordChannelId && memberDiscordIds.length > 0) {
  try {
    await fetch('http://localhost:3001/team/update-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: team.discordChannelId,
        memberDiscordIds,
      }),
    });
  } catch (err) {
    console.error('❌ Failed to update Discord channel:', err);
  }
}

    try {
      await updateDoc(userRef, {
        teamId: team.id,
        team: {
          name: team.name,
          role: 'member',
          position: '',
        },
      });
      // ✅ Send DM to the joining member with link to the channel
try {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || 'YOUR_DISCORD_GUILD_ID'; // fallback if needed

  await fetch('http://localhost:3001/send-dm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      discordId: userData.discord?.id, // from userSnap above
      message: `✅ You’ve joined **${team.name}**!\n\n👉 [Open Team Channel](https://discord.com/channels/${guildId}/${team.discordChannelId})`,
    }),
  });
} catch (err) {
  console.error('❌ Failed to send DM with team channel link:', err);
}
      console.log('✅ User updated successfully');
      const guildId = '1379886523733770390'; // replace with your actual server ID
const channelId = team.discordChannelId;

if (userData.discord?.id && channelId) {
  try {
    await fetch('http://localhost:3001/send-dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: userData.discord.id,
        message: `👋 You’ve been added to team **${team.name}**!\n\n👉 [Open Team Channel](https://discord.com/channels/${guildId}/${channelId})`,
      }),
    });
  } catch (err) {
    console.warn('⚠️ Failed to DM join-requested member:', err);
  }
}
    } catch (err) {
      console.error('❌ Failed to update user:', err);
    }

    setTeam(prev => ({
      ...prev,
      members: updatedMembers,
      memberIds: updatedMemberIds,
      joinRequests: updatedJoinRequests,
    }));
    setJoinRequests(updatedJoinRequests);
  };
// src/app/my-team/page.js
'use client';

// (imports and logic above this point remain unchanged)

// Add after handleAcceptJoinRequest:

  const handleDenyJoinRequest = async (request) => {
    if (!team || !request?.id) return;
    const updatedRequests = joinRequests.filter(r => r.id !== request.id);
    await updateDoc(doc(db, 'teams', team.id), { joinRequests: updatedRequests });
    setJoinRequests(updatedRequests);
  };

  const handleAcceptInvite = async () => {
    if (!user || !pendingInviteTeam) return;
    const { winRate, rank } = await fetchWinRateAndRank(user.uid);
    const newMember = {
      id: user.uid,
      username: user.name || 'Player',
      avatar: user.avatar || '',
      role: 'member',
      position: '',
      rank,
      winRate,
    };
    const updatedTeam = {
      ...pendingInviteTeam,
      members: [...pendingInviteTeam.members, newMember],
      memberIds: [...pendingInviteTeam.memberIds, user.uid],
    };
    await updateDoc(doc(db, 'teams', pendingInviteTeam.id), {
  members: [...pendingInviteTeam.members, newMember],
  memberIds: [...pendingInviteTeam.memberIds, user.uid],
});
    await updateDoc(doc(db, 'users', user.uid), {
  teamId: pendingInviteTeam.id,
  team: {
    name: pendingInviteTeam.name,
    role: 'member',
    position: '',
  },
  invites: { incoming: [] },
});
try {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || 'YOUR_DISCORD_GUILD_ID';
  await fetch('http://localhost:3001/send-dm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      discordId: user.discord?.id,
      message: `✅ You’ve joined **${pendingInviteTeam.name}**!\n\n👉 [Open Team Channel](https://discord.com/channels/${guildId}/${pendingInviteTeam.discordChannelId})`,
    }),
  });
} catch (err) {
  console.error('❌ Failed to send DM with team channel link after invite:', err);
}

// 🔽 Auto-invite the user to the Discord server
const guildId = 'YOUR_DISCORD_GUILD_ID'; // replace with your actual server ID
const channelId = pendingInviteTeam.discordChannelId;

if (user.discord?.id && channelId) {
  try {
    await fetch('http://localhost:3001/send-dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: user.discord.id,
        message: `✅ You’ve joined **${pendingInviteTeam.name}**!\n\n👉 [Open Team Channel](https://discord.com/channels/${guildId}/${channelId})`,
      }),
    });
  } catch (err) {
    console.warn('⚠️ Failed to DM new member (invite):', err);
  }
}

setTeam(updatedTeam);
setPendingInviteTeam(null);
setInvitePromptVisible(false);

// 🔄 Discord channel update logic...
    // Update Discord channel with new member list
const memberDiscordIds = [];
for (const m of updatedTeam.members) {
  const mDoc = await getDoc(doc(db, 'users', m.id));
  const mDiscordId = mDoc.exists() ? mDoc.data().discord?.id : null;
  if (mDiscordId) memberDiscordIds.push(mDiscordId);
}

if (updatedTeam.discordChannelId && memberDiscordIds.length > 0) {
  try {
    await fetch('http://localhost:3001/team/update-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: updatedTeam.discordChannelId,
        memberDiscordIds,
      }),
    });
  } catch (err) {
    console.error('❌ Failed to update Discord channel after accepting invite:', err);
  }
}
  };

  const handleDenyInvite = async () => {
    if (!user || !pendingInviteTeam) return;
    await updateDoc(doc(db, 'users', user.uid), {
      invites: { incoming: [] },
    });
    setPendingInviteTeam(null);
    setInvitePromptVisible(false);
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
  <ClientLayout>
    <div className="max-w-4xl mx-auto p-6 space-y-6 bg-white shadow rounded">
      {/* team creation */}
      {!team && (
        <>
          <h1 className="text-2xl font-bold mb-4">Create a Team</h1>
          <input
            type="text"
            placeholder="Enter team name"
            className="border px-3 py-2 rounded w-full mb-4"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
            onClick={async () => {
              if (!user || !newTeamName.trim()) return;

              const { winRate, rank } = await fetchWinRateAndRank(user.uid);
              const teamId = uuidv4();
              const teamData = {
                name: newTeamName.trim(),
                logoUrl: '',
                captainId: user.uid,
                memberIds: [user.uid],
                members: [{
                  id: user.uid,
                  username: user.name || 'Captain',
                  avatar: user.avatar || '',
                  role: 'captain',
                  position: '',
                  rank,
                  winRate,
                }],
                openForRequests: true,
                joinRequests: [],
                createdAt: serverTimestamp(),
              };

              await setDoc(doc(db, 'teams', teamId), teamData);

              const userDoc = await getDoc(doc(db, 'users', user.uid));
              const discordId = userDoc.data().discord?.id;

              if (discordId) {
                try {
                  const res = await fetch('http://localhost:3001/team/create-channel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      teamName: teamData.name,
                      memberDiscordIds: [discordId],
                      discordId, // ✅ this is critical
                    }),
                  });

                  const data = await res.json();
const channelUrl = data.channelUrl; // ✅ Correct
                  if (channelUrl) {
                    const rawChannelId = channelUrl.split('/').pop();
                    await updateDoc(doc(db, 'teams', teamId), {
                      discordChannelId: rawChannelId,
                    });

                    await fetch('http://localhost:3001/send-dm', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        discordId,
                        message: `📣 Your team **${teamData.name}** has been created and a private Discord chat is ready.\n\n👉 [Open Channel](${channelUrl})`,
                      }),
                    });
                  }
                } catch (err) {
                  console.warn('⚠️ Failed to create channel or DM:', err);
                }
              }

              await updateDoc(doc(db, 'users', user.uid), {
                teamId,
                team: { name: newTeamName.trim(), role: 'captain', position: '' },
              });

              window.location.reload();
            }}
          >
            Create Team
          </button>
        </>
      )}
        {/* invite prompt */}
        {invitePromptVisible && pendingInviteTeam && (
          <div className="border border-yellow-300 bg-yellow-100 p-4 rounded">
            <p className="mb-4 text-yellow-800">
              You have been invited to the team <strong>{pendingInviteTeam.name}</strong>
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={handleAcceptInvite} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Accept</button>
              <button onClick={handleDenyInvite} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Deny</button>
            </div>
          </div>
        )}

        {/* join requests */}
        {isCaptain && joinRequests.length > 0 && (
          <div className="border border-blue-300 bg-blue-50 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Join Requests</h2>
            {joinRequests.map((req) => (
              <div key={req.id} className="flex justify-between items-center mb-2">
                <Link href={`/profile/${req.id}`} className="text-blue-600 hover:underline">{req.username}</Link>
                <div className="flex gap-2">
                  <button onClick={() => handleAcceptJoinRequest(req)} className="bg-green-600 text-white px-3 py-1 rounded">Accept</button>
                  <button onClick={() => handleDenyJoinRequest(req)} className="bg-gray-500 text-white px-3 py-1 rounded">Deny</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* team view */}
        {team && (
          <>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Image src={team.logoUrl || '/default-logo.png'} alt="logo" width={60} height={60} className="rounded" />
                <h1 className="text-2xl font-bold">{team.name}</h1>
              </div>
              {isCaptain && (
                <button
                  onClick={() => {
                    const updated = { ...team, openForRequests: !team.openForRequests };
                    updateDoc(doc(db, 'teams', team.id), { openForRequests: updated.openForRequests });
                    setTeam(updated);
                  }}
                  className={`px-3 py-1 rounded font-semibold text-white ${team.openForRequests ? 'bg-green-600' : 'bg-red-600'}`}
                >
                  {team.openForRequests ? 'Open for requests' : 'Closed for requests'}
                </button>
              )}
            </div>

            {isCaptain && (
              <div className="mb-4">
                <label className="block mb-1 font-medium">Invite via link</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={inviteLink} className="w-full border px-2 py-1 rounded" />
                  <button onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteLink);
                      alert('Invite link copied!');
                    } catch {
                      alert('Failed to copy.');
                    }
                  }} className="bg-blue-600 text-white px-3 py-1 rounded">Copy</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(5)].map((_, i) => {
                const member = team.members[i];
                return (
                  <div key={i} className="border p-4 rounded shadow text-center">
                    {member ? (
                      <>
                        <Image src={member.avatar || '/default-avatar.png'} alt="avatar" width={64} height={64} className="rounded-full mx-auto" />
                        <p className="font-bold mt-2">{member.username}</p>
                        <p className="text-sm text-gray-500">{member.rank || 'Unranked'}</p>
                        <p className="text-sm">WR: {member.winRate || 'N/A'}%</p>
                        <select
                          value={member.position || ''}
                          onChange={(e) => {
                            const newPos = e.target.value;
                            const updated = team.members.map(m =>
                              m.id === member.id ? { ...m, position: newPos } : m
                            );
                            updateDoc(doc(db, 'teams', team.id), { members: updated });
                            setTeam(prev => ({ ...prev, members: updated }));
                            if (member.id === user.uid) {
                              updateDoc(doc(db, 'users', user.uid), {
                                team: { ...user.team, position: newPos },
                              });
                            }
                          }}
                          className="mt-2 w-full border px-2 py-1 rounded text-sm"
                          disabled={!isCaptain && member.id !== user.uid}
                        >
                          <option value="">Select Position</option>
                          {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                        {member.role === 'captain' && <p className="text-yellow-600 mt-1">👑 Captain</p>}
                        {isCaptain && member.id !== user.uid && (
                          <button
                            onClick={async () => {
  const updated = team.members.filter(m => m.id !== member.id);
  const updatedIds = team.memberIds.filter(id => id !== member.id);

  await updateDoc(doc(db, 'teams', team.id), {
    members: updated,
    memberIds: updatedIds,
  });

  setTeam({ ...team, members: updated, memberIds: updatedIds });

  // 👇 Discord update after kicking
  const memberDiscordIds = [];
  for (const m of updated) {
    const mDoc = await getDoc(doc(db, 'users', m.id));
    const mDiscordId = mDoc.exists() ? mDoc.data().discord?.id : null;
    if (mDiscordId) memberDiscordIds.push(mDiscordId);
  }

  if (team.discordChannelId && memberDiscordIds.length > 0) {
    try {
      await fetch('http://localhost:3001/team/update-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: team.discordChannelId,
          memberDiscordIds,
        }),
      });
    } catch (err) {
      console.error('❌ Failed to update Discord channel after kick:', err);
    }
  }
}}
                            className="text-red-600 mt-2 hover:underline text-sm"
                          >
                            Kick
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-400 italic">Empty Slot</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-6">
             <button
  onClick={async () => {
    if (!team || !user) return;

    // 🧹 Delete Discord channel if captain
    if (isCaptain && team.discordChannelId) {
      try {
        await fetch('http://localhost:3001/team/delete-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: team.discordChannelId }),
        });
      } catch (err) {
        console.error('❌ Failed to delete Discord channel:', err);
      }
    }

    if (isCaptain) {
      await deleteDoc(doc(db, 'teams', team.id));
    } else {
      const updatedMembers = team.members.filter(m => m.id !== user.uid);
      const updatedMemberIds = team.memberIds.filter(id => id !== user.uid);
      await updateDoc(doc(db, 'teams', team.id), {
        members: updatedMembers,
        memberIds: updatedMemberIds,
      });

      const memberDiscordIds = [];
      for (const m of updatedMembers) {
        const mDoc = await getDoc(doc(db, 'users', m.id));
        const mDiscordId = mDoc.exists() ? mDoc.data().discord?.id : null;
        if (mDiscordId) memberDiscordIds.push(mDiscordId);
      }

      if (team.discordChannelId && memberDiscordIds.length > 0) {
        try {
          await fetch('http://localhost:3001/team/update-channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelId: team.discordChannelId,
              memberDiscordIds,
            }),
          });
        } catch (err) {
          console.error('❌ Failed to update Discord channel after leave:', err);
        }
      }
    }

    await updateDoc(doc(db, 'users', user.uid), {
      teamId: null,
      team: null,
    });

    window.location.reload();
  }}
  className="bg-red-600 text-white px-4 py-2 rounded"
>
  {isCaptain ? 'Disband Team' : 'Leave Team'}
</button>
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
