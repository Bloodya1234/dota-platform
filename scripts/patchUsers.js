import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function patchUsers() {
  const snapshot = await db.collection('users').get();
  console.log(`Found ${snapshot.size} users`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};

    if (!Array.isArray(data.matches)) updates.matches = [];
    if (!Array.isArray(data.mostPlayedHeroes)) updates.mostPlayedHeroes = [];
    if (!Array.isArray(data.languages)) updates.languages = [];
    if (!Array.isArray(data.preferredPositions)) updates.preferredPositions = [];

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      console.log(`✅ Patched user: ${doc.id}`);
    }
  }

  console.log('✅ All users patched.');
}

patchUsers().catch((err) => {
  console.error('❌ Error patching users:', err);
});
