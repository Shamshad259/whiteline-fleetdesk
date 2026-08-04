import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
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

// --- Added for Customer Profile / list stats ---

export async function getCustomerProfile(customerId) {
  const customerRef = doc(db, "customers", customerId);
  const customerSnap = await getDoc(customerRef);

  if (!customerSnap.exists()) {
    throw new Error("Customer not found");
  }

  const tripsQuery = query(
    collection(db, "trips"),
    where("customerId", "==", customerId),
    orderBy("tripDate", "desc"),
  );
  const tripsSnap = await getDocs(tripsQuery);
  const trips = tripsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    customer: { id: customerSnap.id, ...customerSnap.data() },
    trips,
  };
}

export async function deleteCustomer(id) {
  return deleteDoc(doc(db, "customers", id));
}
