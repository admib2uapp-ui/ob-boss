import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBFyxK7WlyErhIFnmPG-y0tpZ1eua-fZes",
  authDomain: "cabfin-494ac.firebaseapp.com",
  projectId: "cabfin-494ac",
  storageBucket: "cabfin-494ac.firebasestorage.app",
  messagingSenderId: "639070923328",
  appId: "1:639070923328:web:2d8d1be71ae54784864da5",
  measurementId: "G-1HWZBF86MM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Safe Analytics Initialization
let analytics = null;
isSupported().then(yes => {
  if (yes) {
    analytics = getAnalytics(app);
  }
}).catch(err => {
  console.warn("Firebase Analytics not supported in this environment:", err);
});

export { analytics };