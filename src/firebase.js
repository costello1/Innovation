// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, serverTimestamp } from 'firebase/firestore'
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth'
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
const emulatorHost = import.meta.env.DEV && import.meta.env.VITE_FIRESTORE_EMULATOR_HOST
const app = initializeApp(emulatorHost
  ? { ...firebaseConfig, projectId: 'demo-innovation' }
  : firebaseConfig);
const db = getFirestore(app)
const auth = getAuth(app)
if (emulatorHost) {
  const [host, port] = emulatorHost.split(':')
  connectFirestoreEmulator(db, host, Number(port))
  connectAuthEmulator(auth, `http://${host}:9199`, { disableWarnings: true })
}
const nowTs = () => serverTimestamp()

let anonymousLogin
async function ensureVoter() {
  await auth.authStateReady()
  if (auth.currentUser) return auth.currentUser
  if (!anonymousLogin) {
    anonymousLogin = signInAnonymously(auth).then(result => result.user)
      .finally(() => { anonymousLogin = null })
  }
  return anonymousLogin
}

// 🔹 Named exports (quelli che importi altrove)
export { app, db, auth, nowTs, ensureVoter }

// 🔹 (opzionale) default per usi futuri
export default app