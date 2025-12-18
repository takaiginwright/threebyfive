import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAyVFogChA2yr6Ki-wqVEMgX5PdRMIiukM",
  authDomain: "three-by-five.firebaseapp.com",
  projectId: "three-by-five",
  storageBucket: "three-by-five.firebasestorage.app",
  messagingSenderId: "880303513954",
  appId: "1:880303513954:web:a9a1aeb5ff9543f7f24c3b",
  measurementId: "G-VXQ14G1DFE",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();