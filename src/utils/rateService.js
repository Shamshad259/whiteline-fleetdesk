import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export async function addRate(data) {
  return addDoc(collection(db, "rates"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateRate(id, data) {
  return updateDoc(doc(db, "rates", id), data);
}

export async function deleteRate(id) {
  return deleteDoc(doc(db, "rates", id));
}
