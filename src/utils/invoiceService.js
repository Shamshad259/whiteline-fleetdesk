import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export async function generateInvoiceForTrip(
  trip,
  { includeVat = false, vehicleModelName = "", vehiclePlateNumber = "" } = {},
) {
  if (!trip?.id) throw new Error("Trip is required to generate an invoice.");

  const currentYear = new Date().getFullYear();
  const counterRef = doc(db, "invoiceCounters", String(currentYear));
  const invoiceRef = doc(collection(db, "invoices"));
  const tripRef = doc(db, "trips", trip.id);
  const subtotal = Number(trip.amount || 0);
  const vatAmount = includeVat ? subtotal * 0.15 : 0;
  const total = subtotal + vatAmount;
  const createdAt = new Date();

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

    const invoiceNumber = `INV-${currentYear}-${String(newCount).padStart(4, "0")}`;
    const invoiceData = {
      invoiceNumber,
      year: currentYear,
      tripId: trip.id,
      customerId: trip.customerId || "",
      customerName: trip.customerName || "",
      snapshot: {
        tripDate: trip.tripDate || "",
        serviceType: trip.serviceType || "",
        isCustom: Boolean(trip.isCustom),
        customDescription: trip.customDescription || "",
        tierHours: trip.tierHours ?? null,
        vehicleModelName: vehicleModelName || "",
        vehiclePlateNumber: vehiclePlateNumber || "",
        amount: Number(trip.amount || 0),
      },
      vatApplied: Boolean(includeVat),
      subtotal,
      vatAmount,
      total,
      createdAt: serverTimestamp(),
    };

    transaction.set(invoiceRef, invoiceData);

    transaction.update(tripRef, {
      invoiceId: invoiceRef.id,
      invoicedSnapshot: {
        tripDate: trip.tripDate || "",
        serviceType: trip.serviceType || "",
        isCustom: Boolean(trip.isCustom),
        customDescription: trip.customDescription || "",
        tierHours: trip.tierHours ?? null,
        vehicleModelName: vehicleModelName || "",
        vehiclePlateNumber: vehiclePlateNumber || "",
        amount: Number(trip.amount || 0),
        customerName: trip.customerName || "",
      },
    });

    return {
      id: invoiceRef.id,
      ...invoiceData,
      createdAt,
    };
  });
}

export async function deleteInvoiceAndClearTrip(invoiceId, tripId) {
  if (!invoiceId || !tripId)
    throw new Error("Invoice and trip IDs are required.");

  const invoiceRef = doc(db, "invoices", invoiceId);
  const tripRef = doc(db, "trips", tripId);

  return runTransaction(db, async (transaction) => {
    transaction.delete(invoiceRef);
    transaction.update(tripRef, {
      invoiceId: null,
      invoicedSnapshot: null,
    });
  });
}

export function hasTripChangedSinceInvoice(trip) {
  if (!trip?.invoicedSnapshot) return false;

  const snapshot = trip.invoicedSnapshot;
  return (
    trip.tripDate !== snapshot.tripDate ||
    trip.serviceType !== snapshot.serviceType ||
    Boolean(trip.isCustom) !== Boolean(snapshot.isCustom) ||
    (trip.customDescription || "") !== (snapshot.customDescription || "") ||
    (trip.tierHours ?? null) !== (snapshot.tierHours ?? null) ||
    Number(trip.amount || 0) !== Number(snapshot.amount || 0) ||
    (trip.customerName || "") !== (snapshot.customerName || "")
  );
}
