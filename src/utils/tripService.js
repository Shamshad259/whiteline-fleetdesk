import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function addTrip(data) {
  return addDoc(collection(db, "trips"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateTrip(id, data) {
  return updateDoc(doc(db, "trips", id), data);
}

export async function updateTripPayment(id, { paymentStatus, amountPaid }) {
  return updateDoc(doc(db, "trips", id), { paymentStatus, amountPaid });
}

export async function deleteTrip(id) {
  return deleteDoc(doc(db, "trips", id));
}
