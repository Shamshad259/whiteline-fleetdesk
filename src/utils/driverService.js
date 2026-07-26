import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export async function addDriver(data) {
  return addDoc(collection(db, "drivers"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateDriver(id, data) {
  return updateDoc(doc(db, "drivers", id), data);
}

export async function deleteDriver(id) {
  return deleteDoc(doc(db, "drivers", id));
}
