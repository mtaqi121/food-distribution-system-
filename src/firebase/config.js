// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPnwXsvcBsiV9a_I4QE3_0mFGGeO1Ik3Q",
  authDomain: "food-distribution-3a52b.firebaseapp.com",
  projectId: "food-distribution-3a52b",
  storageBucket: "food-distribution-3a52b.firebasestorage.app",
  messagingSenderId: "898041512556",
  appId: "1:898041512556:web:4fb8083e9982f84e0e0e49",
  measurementId: "G-WPED8H86Q2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Analytics only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

