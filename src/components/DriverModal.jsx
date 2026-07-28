import { useState } from "react";
import toast from "react-hot-toast";
import { useVehicles } from "../hooks/useVehicles";
import { useDrivers } from "../hooks/useDrivers";
import { addDriver, updateDriver } from "../utils/driverService";
import { addVehicle } from "../utils/vehicleService";
import { ModalShell } from "./ModalShell";

const VEHICLE_TYPES = ["Sedan", "SUV", "Van", "Luxury", "Bus"];

export function DriverModal({ isOpen, onClose, driverToEdit, onSuccess }) {
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const [form, setForm] = useState(() => ({
    fullName: driverToEdit?.fullName || "",
    phone: driverToEdit?.phone || "",
    driverType: driverToEdit?.driverType || "in-house",
    vehicleId: driverToEdit?.vehicleId || "",
    notes: driverToEdit?.notes || "",
  }));
  const [vehicleMode, setVehicleMode] = useState("existing"); // "existing" or "new"
  const [newVehicle, setNewVehicle] = useState({
    type: "Sedan",
    make: "",
    model: "",
    plateNumber: "",
    color: "",
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Reset vehicle mode when switching driver type
    if (name === "driverType") {
      setVehicleMode("existing");
      setForm((f) => ({ ...f, [name]: value, vehicleId: "" }));
    }
  };

  const handleNewVehicleChange = (e) => {
    setNewVehicle({ ...newVehicle, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let vehicleId = form.vehicleId || null;

      // If freelance driver + adding a new vehicle, create it first
      if (form.driverType === "freelance" && vehicleMode === "new") {
        if (!newVehicle.make || !newVehicle.model || !newVehicle.plateNumber) {
          toast.error("Please fill in the vehicle details");
          setSaving(false);
          return;
        }
        const vehicleDoc = await addVehicle({
          ...newVehicle,
          ownerType: "driver",
        });
        vehicleId = vehicleDoc.id;
      }

      const payload = { ...form, vehicleId };

      if (driverToEdit) {
        await updateDriver(driverToEdit.id, payload);
        toast.success("Driver updated");
      } else {
        await addDriver(payload);
        toast.success("Driver added");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving driver");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={driverToEdit ? "Edit Driver" : "Add Driver"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Driver Type <span className="text-red-500">*</span>
          </label>
          <select
            name="driverType"
            value={form.driverType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="in-house">In-House</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>

        {/* In-house: pick from existing company vehicles */}
        {form.driverType === "in-house" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Vehicle
            </label>
            <select
              name="vehicleId"
              value={form.vehicleId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">No vehicle assigned</option>
              {vehicles
                .filter((v) => v.ownerType === "company")
                .filter(
                  (v) =>
                    v.id === form.vehicleId ||
                    !drivers.some(
                      (d) => d.vehicleId === v.id && d.id !== driverToEdit?.id,
                    ),
                )
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} — {v.plateNumber} ({v.type})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Freelance: choose existing (their own vehicle already in system) or add new */}
        {form.driverType === "freelance" && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setVehicleMode("existing")}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium ${
                  vehicleMode === "existing"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                Use Existing
              </button>
              <button
                type="button"
                onClick={() => setVehicleMode("new")}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium ${
                  vehicleMode === "new"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                Add New Vehicle
              </button>
            </div>

            {vehicleMode === "existing" ? (
              <select
                name="vehicleId"
                value={form.vehicleId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">No vehicle assigned</option>
                {vehicles
                  .filter(
                    (v) =>
                      v.id === form.vehicleId ||
                      !drivers.some(
                        (d) =>
                          d.vehicleId === v.id && d.id !== driverToEdit?.id,
                      ),
                  )
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} — {v.plateNumber} ({v.type}
                      {v.ownerType === "company" ? " · Company" : " · Own"})
                    </option>
                  ))}
              </select>
            ) : (
              <div className="space-y-2">
                <select
                  name="type"
                  value={newVehicle.type}
                  onChange={handleNewVehicleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="make"
                    value={newVehicle.make}
                    onChange={handleNewVehicleChange}
                    placeholder="Make *"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    name="model"
                    value={newVehicle.model}
                    onChange={handleNewVehicleChange}
                    placeholder="Model *"
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <input
                  name="plateNumber"
                  value={newVehicle.plateNumber}
                  onChange={handleNewVehicleChange}
                  placeholder="Plate Number *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  name="color"
                  value={newVehicle.color}
                  onChange={handleNewVehicleChange}
                  placeholder="Colour"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>
        )}

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
