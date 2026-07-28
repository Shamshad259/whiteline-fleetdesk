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

export async function addVehicleModel(data) {
  return addDoc(collection(db, "vehicleModels"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateVehicleModel(id, data) {
  return updateDoc(doc(db, "vehicleModels", id), data);
}

export async function deleteVehicleModel(id) {
  const q = query(collection(db, "vehicles"), where("modelId", "==", id));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error(
      "Cannot delete a model that still has vehicles assigned to it. Reassign or delete those vehicles first.",
    );
  }
  return deleteDoc(doc(db, "vehicleModels", id));
}
