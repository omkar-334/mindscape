import { initializeApp } from 'firebase/app';
import { getAuth, FacebookAuthProvider, TwitterAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAmt5b5Vb1C1IlD-huOMhtmCgbUgY0FlWc",
    authDomain: "soulsync-68899.firebaseapp.com",
    projectId: "soulsync-68899",
    storageBucket: "soulsync-68899.firebasestorage.app",
    messagingSenderId: "411428144202",
    appId: "1:411428144202:web:42aee231da98ff938bd2b3"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const facebookProvider = new FacebookAuthProvider();
export const twitterProvider = new TwitterAuthProvider();