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
  // Unassign any driver currently linked to this vehicle
  const q = query(collection(db, "drivers"), where("vehicleId", "==", id));
  const snapshot = await getDocs(q);
  const unassignPromises = snapshot.docs.map((driverDoc) =>
    updateDoc(doc(db, "drivers", driverDoc.id), { vehicleId: null }),
  );
  await Promise.all(unassignPromises);

  return deleteDoc(doc(db, "vehicles", id));
}
