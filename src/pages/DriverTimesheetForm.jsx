import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  doc,
  getDoc,
  collection,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

const emptyExpense = { type: "", amount: "" };

export function DriverTimesheetForm() {
  const { token } = useParams();
  const [tokenDoc, setTokenDoc] = useState(null);
  const [tokenStatus, setTokenStatus] = useState("loading"); // loading | valid | invalid
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    shiftDate: new Date().toISOString().slice(0, 10),
    serviceRef: "",
    customerName: "",
    customerCode: "",
    passengers: "",
    pickupLocation: "",
    pickupTime: "",
    destination: "",
    garageDepartureTime: "",
    garageReturnTime: "",
    startKm: "",
    endKm: "",
    notes: "",
  });
  const [expenses, setExpenses] = useState([{ ...emptyExpense }]);

  useEffect(() => {
    async function loadToken() {
      try {
        const snap = await getDoc(doc(db, "driverTokens", token));
        if (!snap.exists() || snap.data().active !== true) {
          setTokenStatus("invalid");
          return;
        }
        setTokenDoc(snap.data());
        setTokenStatus("valid");
      } catch {
        setTokenStatus("invalid");
      }
    }
    loadToken();
  }, [token]);

  useEffect(() => {
    if (tokenStatus !== "valid") return;
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const q = query(
      collection(db, "timesheets"),
      where("token", "==", token),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [tokenStatus, token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleExpenseChange = (index, field, value) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    setExpenses(updated);
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, { ...emptyExpense }]);
  };

  const removeExpenseRow = (index) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const totalKm =
    form.startKm && form.endKm
      ? Math.max(0, Number(form.endKm) - Number(form.startKm))
      : "";

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shiftDate || !form.pickupTime) {
      toast.error("Please fill in at least the shift date and pickup time");
      return;
    }

    setSubmitting(true);
    try {
      const counterId = `${token}_${form.shiftDate}`;
      const counterRef = doc(db, "timesheetCounters", counterId);
      const maxEntries = tokenDoc.maxDailyEntries || 3;

      await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const currentCount = counterSnap.exists()
          ? counterSnap.data().count
          : 0;

        if (currentCount >= maxEntries) {
          throw new Error(
            `You've reached the limit of ${maxEntries} entries for ${form.shiftDate}. Contact your admin if you need to add more.`,
          );
        }

        const newEntryRef = doc(collection(db, "timesheets"));
        transaction.set(newEntryRef, {
          token,
          driverId: tokenDoc.driverId,
          shiftDate: form.shiftDate,
          serviceRef: form.serviceRef,
          customerName: form.customerName?.trim() || "",
          customerCode: form.customerCode?.trim() || "",
          passengers: form.passengers ? Number(form.passengers) : null,
          pickupLocation: form.pickupLocation,
          pickupTime: form.pickupTime,
          destination: form.destination,
          garageDepartureTime: form.garageDepartureTime,
          garageReturnTime: form.garageReturnTime,
          startKm: form.startKm ? Number(form.startKm) : null,
          endKm: form.endKm ? Number(form.endKm) : null,
          totalKm: totalKm || null,
          expenses: expenses.filter((ex) => ex.type && ex.amount),
          totalExpenses,
          notes: form.notes,
          createdAt: serverTimestamp(),
        });

        transaction.set(
          counterRef,
          { count: currentCount + 1 },
          { merge: true },
        );
      });

      toast.success("Shift submitted");
      setForm({
        shiftDate: new Date().toISOString().slice(0, 10),
        serviceRef: "",
        customerName: "",
        customerCode: "",
        passengers: "",
        pickupLocation: "",
        pickupTime: "",
        destination: "",
        garageDepartureTime: "",
        garageReturnTime: "",
        startKm: "",
        endKm: "",
        notes: "",
      });
      setExpenses([{ ...emptyExpense }]);
    } catch (err) {
      toast.error(err.message || "Error submitting shift");
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Link Not Valid
          </h1>
          <p className="text-gray-600">
            This timesheet link is invalid or has been deactivated. Please
            contact your admin for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Hi {tokenDoc.fullName}
        </h1>
        <p className="text-gray-600 mb-6">Log your shift details below.</p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-gray-200 p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="shiftDate"
              value={form.shiftDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service / Mission Ref
            </label>
            <input
              name="serviceRef"
              value={form.serviceRef}
              onChange={handleChange}
              placeholder="e.g. Airport Transfer, Full Day"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name (optional)
            </label>
            <input
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Code (if known)
            </label>
            <input
              name="customerCode"
              value={form.customerCode}
              onChange={handleChange}
              placeholder="e.g. WLC-0004"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passengers
            </label>
            <input
              type="number"
              name="passengers"
              value={form.passengers}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location
              </label>
              <input
                name="pickupLocation"
                value={form.pickupLocation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="pickupTime"
                value={form.pickupTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination
            </label>
            <input
              name="destination"
              value={form.destination}
              onChange={handleChange}
              placeholder="e.g. To Be Confirmed / At Disposal"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Garage Departure Time
              </label>
              <input
                type="time"
                name="garageDepartureTime"
                value={form.garageDepartureTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Garage Return Time
              </label>
              <input
                type="time"
                name="garageReturnTime"
                value={form.garageReturnTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start KM
              </label>
              <input
                type="number"
                name="startKm"
                value={form.startKm}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End KM
              </label>
              <input
                type="number"
                name="endKm"
                value={form.endKm}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total KM
              </label>
              <input
                readOnly
                value={totalKm}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Expenses
              </label>
              <button
                type="button"
                onClick={addExpenseRow}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                + Add
              </button>
            </div>
            {expenses.map((exp, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  placeholder="Type (e.g. Parking)"
                  value={exp.type}
                  onChange={(e) =>
                    handleExpenseChange(i, "type", e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={exp.amount}
                  onChange={(e) =>
                    handleExpenseChange(i, "amount", e.target.value)
                  }
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                />
                {expenses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExpenseRow(i)}
                    className="px-2 text-red-600 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <p className="text-sm text-gray-600 text-right">
              Total: SAR {totalExpenses}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Shift"}
          </button>
        </form>

        {entries.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Your Recent Submissions
            </h2>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg border border-gray-200 p-3 text-sm"
                >
                  <p className="font-medium text-gray-900">
                    {entry.shiftDate} · {entry.serviceRef || "No service ref"}
                  </p>
                  <p className="text-gray-600">
                    {entry.pickupLocation} → {entry.destination || "TBC"} ·{" "}
                    {entry.pickupTime}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
