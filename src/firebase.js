// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQXQGaiFntpG8d2QDY56NDKblPCl4ciFg",
  authDomain: "hrtc-db.firebaseapp.com",
  databaseURL: "https://hrtc-db-default-rtdb.firebaseio.com",
  projectId: "hrtc-db",
  storageBucket: "hrtc-db.firebasestorage.app",
  messagingSenderId: "171922799155",
  appId: "1:171922799155:web:4b6122e8c5f4e998294146"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);