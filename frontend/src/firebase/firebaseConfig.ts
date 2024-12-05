// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, setPersistence, browserLocalPersistence, browserSessionPersistence, updateProfile, sendPasswordResetEmail   } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY as string,
    authDomain: "soccer-drop-in.firebaseapp.com",
    projectId: "soccer-drop-in",
    storageBucket: "soccer-drop-in.appspot.com",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: process.env.REACT_APP_FIREBASE_APP_ID as string,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID as string 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { auth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, db, setPersistence, browserLocalPersistence, browserSessionPersistence, updateProfile, sendPasswordResetEmail  };