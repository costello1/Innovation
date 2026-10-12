// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, serverTimestamp } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-zpYZmDKiLGBFPgCXzwUqnM0lpA6J8sE",
  authDomain: "innovation-f1ffa.firebaseapp.com",
  projectId: "innovation-f1ffa",
  storageBucket: "innovation-f1ffa.firebasestorage.app",
  messagingSenderId: "31174858231",
  appId: "1:31174858231:web:b66a50f34db4ddd5b94af2",
  measurementId: "G-71Y0R895JD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app)
const nowTs = () => serverTimestamp()

// 🔹 Named exports (quelli che importi altrove)
export { app, db, nowTs }

// 🔹 (opzionale) default per usi futuri
export default app