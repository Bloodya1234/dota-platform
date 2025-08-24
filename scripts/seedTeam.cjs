const admin = require('firebase-admin');
const fs = require('fs');

// Load service account key
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function seedTeams() {
  const teams = [
    {
      name: 'Radiant Elite',
      captainId: 'steam:76561199657449468',
      openForRequests: true,
      members: [
        {
          id: 'steam:76561199657449468',
          username: 'petrus',
          role: 'captain',
          rank: 'Immortal',
          winRate: 46,
          avatar: 'https://avatars.steamstatic.com/29b7df70377803f60c2ea1024acb2c3e10fa44b3_full.jpg',
          position: '',
        },
        {
          id: 'steam:76561199821625335',
          username: 'itsuke',
          role: 'member',
          rank: 'Divine 5',
          winRate: 50,
          avatar: 'https://avatars.steamstatic.com/e4a131c7a30e98103323aa65f8876677b6c4b751_full.jpg',
          position: 'Mid lane',
        },
      ],
      // 🟢 Add this line:
      memberIds: ['steam:76561199657449468', 'steam:76561199821625335'],

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  for (const team of teams) {
    try {
      await db.collection('teams').add(team);
      console.log(`✅ Added team: ${team.name}`);
    } catch (err) {
      console.error(`❌ Error adding team ${team.name}:`, err.message);
    }
  }

  process.exit(0);
}

seedTeams();
