import {
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export async function updateTimesheet(id, data) {
  return updateDoc(doc(db, "timesheets", id), data);
}

export async function deleteTimesheet(id) {
  return deleteDoc(doc(db, "timesheets", id));
}

export async function addTimesheetManually(data) {
  return addDoc(collection(db, "timesheets"), {
    ...data,
    createdAt: serverTimestamp(),
    addedByAdmin: true,
  });
}
