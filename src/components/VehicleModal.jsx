import { useState } from "react";
import toast from "react-hot-toast";
import { addVehicle, updateVehicle } from "../utils/vehicleService";
import { useVehicleClasses } from "../hooks/useVehicleClasses";
import { useVehicleModels } from "../hooks/useVehicleModels";
import { VehicleClassModal } from "./VehicleClassModal";
import { VehicleModelModal } from "./VehicleModelModal";
import { ModalShell } from "./ModalShell";

export function VehicleModal({ isOpen, onClose, vehicleToEdit, onSuccess }) {
  const { vehicleClasses } = useVehicleClasses();
  const { vehicleModels } = useVehicleModels();

  const initialModel = vehicleModels.find(
    (m) => m.id === vehicleToEdit?.modelId,
  );

  const [form, setForm] = useState(() => ({
    classId: initialModel?.classId || "",
    modelId: vehicleToEdit?.modelId || "",
    plateNumber: vehicleToEdit?.plateNumber || "",
    year: vehicleToEdit?.year || "",
    color: vehicleToEdit?.color || "",
  }));
  const [saving, setSaving] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  if (!isOpen) return null;

  const modelsForClass = vehicleModels.filter(
    (m) => m.classId === form.classId,
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "classId") {
      setForm({ ...form, classId: value, modelId: "" });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.modelId) {
      toast.error("Please select a vehicle model");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        modelId: form.modelId,
        plateNumber: form.plateNumber,
        year: form.year ? Number(form.year) : null,
        color: form.color,
        ownerType: "company",
      };
      if (vehicleToEdit) {
        await updateVehicle(vehicleToEdit.id, payload);
        toast.success("Vehicle updated");
      } else {
        await addVehicle(payload);
        toast.success("Vehicle added");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={vehicleToEdit ? "Edit Vehicle" : "Add Vehicle"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Vehicle Class <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsClassModalOpen(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              + Add New Class
            </button>
          </div>
          <select
            name="classId"
            value={form.classId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select class...</option>
            {vehicleClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {form.classId && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Vehicle Model <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                + Add New Model
              </button>
            </div>
            <select
              name="modelId"
              value={form.modelId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select model...</option>
              {modelsForClass.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {modelsForClass.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No models under this class yet — add one above.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="number"
              name="year"
              value={form.year}
              onChange={handleChange}
              placeholder="e.g. 2023"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <input
              name="color"
              value={form.color}
              onChange={handleChange}
              placeholder="e.g. White"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plate Number <span className="text-red-500">*</span>
          </label>
          <input
            name="plateNumber"
            value={form.plateNumber}
            onChange={handleChange}
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

      {isClassModalOpen && (
        <VehicleClassModal
          isOpen={isClassModalOpen}
          onClose={() => setIsClassModalOpen(false)}
          classToEdit={null}
          onSuccess={(newClassId) => {
            if (newClassId) {
              setForm((f) => ({ ...f, classId: newClassId, modelId: "" }));
            }
          }}
        />
      )}

      {isModelModalOpen && (
        <VehicleModelModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          modelToEdit={null}
          vehicleClasses={vehicleClasses}
          defaultClassId={form.classId}
          onSuccess={(newModelId) => {
            if (newModelId) {
              setForm((f) => ({ ...f, modelId: newModelId }));
            }
          }}
        />
      )}
    </ModalShell>
  );
}
