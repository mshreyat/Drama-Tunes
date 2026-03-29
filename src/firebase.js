import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyAXDnKKiQ3AJoJyF6JU9IPbic1Uhdnw9Q0",
  authDomain: "dramatunes-68c78.firebaseapp.com",
  databaseURL: "https://dramatunes-68c78-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "dramatunes-68c78",
  storageBucket: "dramatunes-68c78.firebasestorage.app",
  messagingSenderId: "510034095137",
  appId: "1:510034095137:web:4b90dccb6c3597799d0760"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const auth = getAuth(app)