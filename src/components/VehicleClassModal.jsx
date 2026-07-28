import { useState } from "react";
import toast from "react-hot-toast";
import {
  addVehicleClass,
  updateVehicleClass,
} from "../utils/vehicleClassService";
import { ModalShell } from "./ModalShell";

export function VehicleClassModal({ isOpen, onClose, classToEdit, onSuccess }) {
  const [form, setForm] = useState(() => ({
    name: classToEdit?.name || "",
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
      let newId = classToEdit?.id;
      if (classToEdit) {
        await updateVehicleClass(classToEdit.id, form);
        toast.success("Vehicle class updated");
      } else {
        const docRef = await addVehicleClass(form);
        newId = docRef.id;
        toast.success("Vehicle class added");
      }
      onSuccess(newId);
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving vehicle class");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={classToEdit ? "Edit Vehicle Class" : "Add Vehicle Class"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. SUV, Sedan, Van, Coach"
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
