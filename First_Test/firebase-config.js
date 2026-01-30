// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC894z5MfmIviz8YOnTpssizDOVCTOZtD8",
  authDomain: "first-test-19fce.firebaseapp.com",
  databaseURL: "https://first-test-19fce-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "first-test-19fce",
  storageBucket: "first-test-19fce.firebasestorage.app",
  messagingSenderId: "147599904419",
  appId: "1:147599904419:web:b6334284341a530bca7916",
  measurementId: "G-8YX349L55M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

console.log("Firebase initialized successfully with Realtime Database!");