
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// User-provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA42MljmUSLmlyv_tHxLAeTfo2hXo-NSOs",
  authDomain: "bank-statement-converter-20337.firebaseapp.com",
  projectId: "bank-statement-converter-20337",
  storageBucket: "bank-statement-converter-20337.appspot.com", // Corrected .firebasestorage.app to .appspot.com as per typical Firebase convention
  messagingSenderId: "316807776420",
  appId: "1:316807776420:web:554bad62b0039f63043e31",
  measurementId: "G-ZZJ1WBVHY8"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);

export { app, auth };
