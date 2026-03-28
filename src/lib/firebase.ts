import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDObexM3wGAhT-PUPQEr8phZcsEmkL8Pow",
  authDomain: "mjbet-e4ed1.firebaseapp.com",
  projectId: "mjbet-e4ed1",
  storageBucket: "mjbet-e4ed1.firebasestorage.app",
  messagingSenderId: "571803327330",
  appId: "1:571803327330:web:ec1f15e9b8ffee0a17ea3b",
  measurementId: "G-SYN3K09SKP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
