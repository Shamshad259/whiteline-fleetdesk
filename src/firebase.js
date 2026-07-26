import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDmQe3F92VvFcop4ICrZXpckS0HIHjD0Hk",
  authDomain: "whiteline-fleetdesk.firebaseapp.com",
  projectId: "whiteline-fleetdesk",
  storageBucket: "whiteline-fleetdesk.firebasestorage.app",
  messagingSenderId: "796983862910",
  appId: "1:796983862910:web:43366ab15ff572f0691a2f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
