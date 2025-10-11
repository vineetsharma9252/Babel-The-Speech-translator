import { initializeApp } from "firebase/app";
import FIREBASE_API_KEY from "@env";

console.log(FIREBASE_API_KEY);

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: "projectbabel-bfe46.firebaseapp.com",
  projectId: "projectbabel-bfe46",
  storageBucket: "projectbabel-bfe46.firebasestorage.app",
  messagingSenderId: "161007614375",
  appId: "1:161007614375:web:ffe195fad97be750685e82",
  measurementId: "G-XQ7T0RX53Y"
};

const app = initializeApp(firebaseConfig);