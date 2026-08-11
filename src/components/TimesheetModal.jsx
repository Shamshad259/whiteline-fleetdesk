import { useState } from "react";
import toast from "react-hot-toast";
import {
  updateTimesheet,
  addTimesheetManually,
} from "../utils/timesheetService";
import { ModalShell } from "./ModalShell";

const emptyExpense = { type: "", amount: "" };

export function TimesheetModal({
  isOpen,
  onClose,
  entryToEdit,
  driverId,
  driverName,
  onSuccess,
}) {
  const [form, setForm] = useState(() => ({
    shiftDate: entryToEdit?.shiftDate || new Date().toISOString().slice(0, 10),
    serviceRef: entryToEdit?.serviceRef || "",
    customerName: entryToEdit?.customerName || "",
    customerCode: entryToEdit?.customerCode || "",
    passengers: entryToEdit?.passengers ?? "",
    pickupLocation: entryToEdit?.pickupLocation || "",
    pickupTime: entryToEdit?.pickupTime || "",
    destination: entryToEdit?.destination || "",
    garageDepartureTime: entryToEdit?.garageDepartureTime || "",
    garageReturnTime: entryToEdit?.garageReturnTime || "",
    startKm: entryToEdit?.startKm ?? "",
    endKm: entryToEdit?.endKm ?? "",
    notes: entryToEdit?.notes || "",
  }));
  const [expenses, setExpenses] = useState(
    entryToEdit?.expenses?.length
      ? entryToEdit.expenses
      : [{ ...emptyExpense }],
  );
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleExpenseChange = (index, field, value) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    setExpenses(updated);
  };

  const addExpenseRow = () => setExpenses([...expenses, { ...emptyExpense }]);
  const removeExpenseRow = (index) =>
    setExpenses(expenses.filter((_, i) => i !== index));

  const totalKm =
    form.startKm !== "" && form.endKm !== ""
      ? Math.max(0, Number(form.endKm) - Number(form.startKm))
      : null;

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        shiftDate: form.shiftDate,
        serviceRef: form.serviceRef,
        customerName: form.customerName,
        customerCode: form.customerCode,
        passengers: form.passengers !== "" ? Number(form.passengers) : null,
        pickupLocation: form.pickupLocation,
        pickupTime: form.pickupTime,
        destination: form.destination,
        garageDepartureTime: form.garageDepartureTime,
        garageReturnTime: form.garageReturnTime,
        startKm: form.startKm !== "" ? Number(form.startKm) : null,
        endKm: form.endKm !== "" ? Number(form.endKm) : null,
        totalKm,
        expenses: expenses.filter((ex) => ex.type && ex.amount),
        totalExpenses,
        notes: form.notes,
      };

      if (entryToEdit) {
        await updateTimesheet(entryToEdit.id, payload);
        toast.success("Timesheet entry updated");
      } else {
        await addTimesheetManually({
          ...payload,
          driverId,
          token: null,
        });
        toast.success("Timesheet entry added");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving timesheet entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={
        entryToEdit
          ? `Edit Timesheet Entry — ${driverName}`
          : `Add Timesheet Entry — ${driverName}`
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              Customer Code (optional)
            </label>
            <input
              name="customerCode"
              value={form.customerCode}
              onChange={handleChange}
              placeholder="e.g. WLC-0004"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
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
              Pickup Time
            </label>
            <input
              type="time"
              name="pickupTime"
              value={form.pickupTime}
              onChange={handleChange}
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
              value={totalKm ?? ""}
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
                placeholder="Type"
                value={exp.type}
                onChange={(e) => handleExpenseChange(i, "type", e.target.value)}
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

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
