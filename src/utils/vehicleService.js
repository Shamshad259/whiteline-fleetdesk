import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export async function addVehicle(data) {
  return addDoc(collection(db, "vehicles"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateVehicle(id, data) {
  return updateDoc(doc(db, "vehicles", id), data);
}

export async function deleteVehicle(id) {
  return deleteDoc(doc(db, "vehicles", id));
}
