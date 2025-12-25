import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
// (If you haven't set up Firebase yet, the app will still open, 
// but saving quizzes won't work until you add these keys later)
const firebaseConfig = {
  apiKey: "AIzaSyB2XJ8WWZzq3C1yL2DgE0CPlOJ_Ehixf1c",
  authDomain: "eduquizai-a83ee.firebaseapp.com",
  projectId: "eduquizai-a83ee",
  storageBucket: "eduquizai-a83ee.firebasestorage.app",
  messagingSenderId: "222186239832",
  appId: "1:222186239832:web:1474acdbfb9f4da393d72d",
  measurementId: "G-CE74NEYJBE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- GEMINI AI KEY (Added!) ---
export const GEMINI_API_KEY = "AIzaSyC2aU5-L9NAhyDiACu_CH_yBNh6bXlwNQE";