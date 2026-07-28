import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

export async function addVehicleClass(data) {
  return addDoc(collection(db, "vehicleClasses"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateVehicleClass(id, data) {
  return updateDoc(doc(db, "vehicleClasses", id), data);
}

export async function deleteVehicleClass(id) {
  const q = query(collection(db, "vehicleModels"), where("classId", "==", id));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error(
      "Cannot delete a class that still has models under it. Delete or reassign those models first.",
    );
  }
  return deleteDoc(doc(db, "vehicleClasses", id));
}
