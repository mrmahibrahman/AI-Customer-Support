// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {getFirestore} from 'firebase/firestore';
import {getAuth} from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "ai-customer-support-6ca67.firebaseapp.com",
  projectId: "ai-customer-support-6ca67",
  storageBucket: "ai-customer-support-6ca67.appspot.com",
  messagingSenderId: "1065963230995",
  appId: "1:1065963230995:web:fcca7d4c6784576f3b2ce6",
  measurementId: "G-WZC1P0HT9D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

let analytics;
if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(console.error);
}

export { firestore, auth, analytics };
export default app;