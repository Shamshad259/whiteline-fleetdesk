import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function generateCustomerCode() {
  const counterRef = doc(db, "customerCounters", "global");

  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const existingCount = counterDoc.exists()
      ? Number(counterDoc.data().count || 0)
      : 0;
    const newCount = existingCount + 1;

    if (!counterDoc.exists()) {
      transaction.set(counterRef, { count: 0 });
    }

    transaction.update(counterRef, { count: newCount });

    return `WLC-${String(newCount).padStart(4, "0")}`;
  });
}

export async function addCustomer(data) {
  const code = await generateCustomerCode();

  return addDoc(collection(db, "customers"), {
    ...data,
    code,
    createdAt: serverTimestamp(),
  });
}

export async function assignCodeToExistingCustomer(customerId) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const code = await generateCustomerCode();
  return updateDoc(doc(db, "customers", customerId), { code });
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
