import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
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
  const driverRef = doc(db, "drivers", id);
  const driverSnap = await getDoc(driverRef);
  const driver = driverSnap.data();

  // If this driver has a driver-owned vehicle linked, delete that too
  if (driver?.vehicleId) {
    const vehicleRef = doc(db, "vehicles", driver.vehicleId);
    const vehicleSnap = await getDoc(vehicleRef);
    if (vehicleSnap.exists() && vehicleSnap.data().ownerType === "driver") {
      await deleteDoc(vehicleRef);
    }
  }

  return deleteDoc(driverRef);
}
