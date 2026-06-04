// ═══════════════════════════════════════════════════════════════
//  js/config.js — Firebase + Stripe configuration
//
//  SETUP STEPS:
//  1. Go to https://console.firebase.google.com
//     → Create a project → Add a Web App → copy config below
//  2. In Firebase Console enable:
//     → Authentication → Email/Password
//     → Firestore Database (start in test mode, then lock down)
//  3. Go to https://dashboard.stripe.com/apikeys
//     → Copy your Publishable Key into STRIPE_PK below
//  4. Change ADMIN_PASSWORD and ADMIN_EMAIL to your own values
// ═══════════════════════════════════════════════════════════════

import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection, addDoc,
  query, where, getDocs,
  doc, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── 🔥 Replace with your Firebase project config ──────────────
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── 💳 Replace with your Stripe Publishable Key ───────────────
window.STRIPE_PK = "YOUR_STRIPE_PUBLISHABLE_KEY";

// ── 🔐 Admin credentials (change these!) ─────────────────────
window.ADMIN_PASSWORD = "prism2026";
window.ADMIN_EMAIL    = "admin@prismlawncare.com";

// ─────────────────────────────────────────────────────────────
//  Internal setup — no edits needed below this line
// ─────────────────────────────────────────────────────────────
const isDemo = firebaseConfig.apiKey === "YOUR_API_KEY";
window.__demoMode = isDemo;

if (!isDemo) {
  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  window.__auth = auth;
  window.__db   = db;
  window.__fbFns = {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    collection, addDoc,
    query, where, getDocs,
    doc, deleteDoc, updateDoc
  };

  // Auth state listener — calls onUserLoggedIn / onUserLoggedOut
  // defined in auth.js (loaded after this file)
  window.__fbFns.onAuthStateChanged(auth, user => {
    if (typeof onUserLoggedIn === "function") {
      user ? onUserLoggedIn(user) : onUserLoggedOut();
    }
  });
}

// Signal that config is ready
document.dispatchEvent(new Event("firebase-ready"));
