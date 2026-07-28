import { useState } from "react";
import toast from "react-hot-toast";
import { ModalShell } from "./ModalShell";
import { addRate, updateRate } from "../utils/rateService";

const SERVICE_TYPES = [
  "Airport Transfer",
  "City Transfer",
  "Hourly Transfer",
  "Full Day",
  "Half Day",
  "Extra Hourly Charge",
];
const VEHICLE_TYPES = ["Sedan", "SUV", "Van", "Luxury", "Bus"];

export function RateModal({ isOpen, onClose, rateToEdit, onSuccess }) {
  const [form, setForm] = useState(() => ({
    serviceType: rateToEdit?.serviceType || SERVICE_TYPES[0],
    vehicleType: rateToEdit?.vehicleType || VEHICLE_TYPES[0],
    rate: rateToEdit?.rate ?? "",
  }));
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, rate: Number(form.rate) };
      if (rateToEdit) {
        await updateRate(rateToEdit.id, payload);
        toast.success("Rate updated");
      } else {
        await addRate(payload);
        toast.success("Rate added");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving rate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={rateToEdit ? "Edit Rate" : "Add Rate"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Type <span className="text-red-500">*</span>
          </label>
          <select
            name="serviceType"
            value={form.serviceType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Type <span className="text-red-500">*</span>
          </label>
          <select
            name="vehicleType"
            value={form.vehicleType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {VEHICLE_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rate (SAR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="rate"
            value={form.rate}
            onChange={handleChange}
            min="0"
            required
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
