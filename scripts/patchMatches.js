import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function patchUsersWithMatchesField() {
  const snapshot = await db.collection('users').get();

  const promises = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!Array.isArray(data.matches)) {
      console.log(`🔧 Updating ${doc.id} with empty matches field`);
      promises.push(doc.ref.update({ matches: [] }));
    }
  });

  await Promise.all(promises);
  console.log(`✅ Done. Patched ${promises.length} user(s).`);
}

patchUsersWithMatchesField().catch((err) => {
  console.error('❌ Error updating users:', err);
});
