import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

function generateToken() {
  // Long, unguessable random string
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function generateDriverToken(driverId, fullName, maxDailyEntries) {
  const newToken = generateToken();
  await setDoc(doc(db, "driverTokens", newToken), {
    driverId,
    fullName,
    maxDailyEntries: maxDailyEntries || 3,
    active: true,
    createdAt: serverTimestamp(),
  });
  return newToken;
}

export async function deactivateDriverToken(token) {
  return updateDoc(doc(db, "driverTokens", token), { active: false });
}

export async function updateTokenMaxEntries(token, maxDailyEntries) {
  return updateDoc(doc(db, "driverTokens", token), { maxDailyEntries });
}
