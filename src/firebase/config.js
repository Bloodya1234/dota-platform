import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAova03OmNbNjqt-K6O707rFF6NLy5bhUk",
  authDomain: "dota-tourney.firebaseapp.com",
  projectId: "dota-tourney",
  storageBucket: "dota-tourney.appspot.com", // ✅ fixed here
  messagingSenderId: "834694688820",
  appId: "1:834694688820:web:a823f6df8cb01ebfa45a61"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
