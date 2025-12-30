
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyBPnwXsvcBsiV9a_I4QE3_0mFGGeO1Ik3Q",
  authDomain: "food-distribution-3a52b.firebaseapp.com",
  projectId: "food-distribution-3a52b",
  storageBucket: "food-distribution-3a52b.firebasestorage.app",
  messagingSenderId: "898041512556",
  appId: "1:898041512556:web:4fb8083e9982f84e0e0e49",
  measurementId: "G-WPED8H86Q2"
};

const app = initializeApp(firebaseConfig);
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
