import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBfCLdqhyNws2-3ZidKMGKXNweG0-6kks0",
  authDomain: "luo-music-store-8a23d.firebaseapp.com",
  databaseURL: "https://luo-music-store-8a23d-default-rtdb.firebaseio.com",
  projectId: "luo-music-store-8a23d",
  storageBucket: "luo-music-store-8a23d.firebasestorage.app",
  messagingSenderId: "351930823514",
  appId: "1:351930823514:web:ef0cc1f70cc0aede327963",
  measurementId: "G-2CEG0Z0QVB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
