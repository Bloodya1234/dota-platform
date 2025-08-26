// src/firebase.js
// Клиентский Firebase SDK (Web). Импортируй это ТОЛЬКО из клиентских компонентов.
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,                 // ОБЯЗАТЕЛЬНО
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,         // ОБЯЗАТЕЛЬНО
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID            // можно дублировать из FIREBASE_PROJECT_ID
             || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,   // опционально/желательно
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // опционально/желательно
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,                   // ОБЯЗАТЕЛЬНО
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,   // опционально
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
