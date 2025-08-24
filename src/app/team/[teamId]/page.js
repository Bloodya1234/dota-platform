'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/firebase';
import ClientLayout from '@/components/ClientLayout';
import Image from 'next/image';

const db = getFirestore(app);
const auth = getAuth(app);

export default function TeamViewerPage() {
  const { teamId } = useParams();
  const router = useRouter();
  const [team, setTeam] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isViewer, setIsViewer] = useState(true);
  const [loading, setLoading] = useState(true);
  const [membersWithStats, setMembersWithStats] = useState([]);

  useEffect(() => {
    let unsub;

    async function fetchTeam(user) {
      if (!user || !teamId) {
        console.warn('Missing user or teamId');
        setLoading(false);
        return;
      }

      try {
        // Fetch team document
        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);
        if (!teamSnap.exists()) {
          console.warn('Team not found');
          setTeam(null);
          setLoading(false);
          return;
        }

        const teamData = teamSnap.data();
        setTeam({ id: teamSnap.id, ...teamData });

        // Fetch current user Firestore document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;

        const isCaptain = user.uid === teamData.captainId;
        const isExplicitMember = teamData.memberIds?.includes(user.uid);
        const hasAccepted = userData?.teamId === teamSnap.id;

        // Redirect if the user is a proper member but hasn't joined yet
        if ((isCaptain || (isExplicitMember && hasAccepted)) && userData?.teamId !== teamSnap.id) {
          router.push('/team');
          return;
        }

        // ✅ Fetch latest member stats from backend
        const memberStats = await Promise.all(
          (teamData.memberIds || []).map(async (uid) => {
            try {
              const res = await fetch(`/api/users/${uid}`);
              if (!res.ok) throw new Error('User fetch failed');
              const data = await res.json();

              return {
                id: uid,
                username: data.name || 'Unknown',
                avatar: data.avatar || '/default-avatar.png',
                rank: formatRank(data.rankTier),
                winRate: data.winRate ?? 'N/A',
              };
            } catch (err) {
              console.warn(`❌ Failed to fetch stats for user ${uid}:`, err.message);
              return {
                id: uid,
                username: 'Unknown',
                avatar: '/default-avatar.png',
                rank: 'Unknown',
                winRate: 'N/A',
              };
            }
          })
        );

        setMembersWithStats(memberStats);
        setIsViewer(true);
      } catch (err) {
        console.error('❌ Error fetching team:', err.message);
        setTeam(null);
      }

      setLoading(false);
    }

    unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) fetchTeam(user);
      else setLoading(false);
    });

    return () => unsub && unsub();
  }, [teamId]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!team) {
    return (
      <div className="p-6 text-red-600">
        Team not found or you don't have permission to view this team.
      </div>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Image
            src={team.logoUrl || '/default-logo.png'}
            width={60}
            height={60}
            alt="Team Logo"
            className="rounded"
          />
          <h1 className="text-2xl font-bold">{team.name}</h1>
        </div>

        <h2 className="text-xl mt-4 font-semibold">Members</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {membersWithStats.map((member) => (
            <div key={member.id} className="border p-4 rounded text-center">
              <Image
                src={member.avatar}
                width={64}
                height={64}
                alt="Avatar"
                className="rounded-full mx-auto"
              />
              <p className="mt-2 font-semibold">{member.username}</p>
              <p className="text-sm">{member.rank}</p>
              <p className="text-sm">WR: {member.winRate}%</p>
            </div>
          ))}
        </div>

        {isViewer && (
          <div className="mt-4 text-gray-500 text-sm italic">
            You are viewing this team as a guest.
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

// 🧠 Convert rankTier to readable name
function formatRank(tier) {
  const map = {
    11: 'Herald I', 12: 'Herald II', 13: 'Herald III', 14: 'Herald IV', 15: 'Herald V',
    21: 'Guardian I', 22: 'Guardian II', 23: 'Guardian III', 24: 'Guardian IV', 25: 'Guardian V',
    31: 'Crusader I', 32: 'Crusader II', 33: 'Crusader III', 34: 'Crusader IV', 35: 'Crusader V',
    41: 'Archon I', 42: 'Archon II', 43: 'Archon III', 44: 'Archon IV', 45: 'Archon V',
    51: 'Legend I', 52: 'Legend II', 53: 'Legend III', 54: 'Legend IV', 55: 'Legend V',
    61: 'Ancient I', 62: 'Ancient II', 63: 'Ancient III', 64: 'Ancient IV', 65: 'Ancient V',
    71: 'Divine I', 72: 'Divine II', 73: 'Divine III', 74: 'Divine IV', 75: 'Divine V',
    80: 'Immortal',
  };
  return map[tier] || 'Unranked';
}
