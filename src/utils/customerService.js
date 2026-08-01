import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function addCustomer(data) {
  return addDoc(collection(db, "customers"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateCustomer(id, data) {
  return updateDoc(doc(db, "customers", id), data);
}
