import { useState } from "react";
import toast from "react-hot-toast";
import {
  addVehicleModel,
  updateVehicleModel,
} from "../utils/vehicleModelService";
import { ModalShell } from "./ModalShell";

const emptyStandardRates = {
  fullDayTiers: [{ hours: "", amount: "" }],
  halfDay: { hours: "", amount: "" },
  hourly: { amount: "", minHours: "" },
  cityTransfer: { amount: "" },
  airportTransfer: { amount: "", maxKm: "" },
  extraPerKm: "",
  extraHourlyCharge: "",
};

const emptyCoachRates = {
  hourTiers: [{ hours: "", amount: "" }],
  transfer: { amount: "" },
  extraHourlyCharge: "",
};

function buildInitialForm(modelToEdit) {
  const rateShape = modelToEdit?.rateShape || "standard";
  if (modelToEdit) {
    return {
      classId: modelToEdit.classId || "",
      name: modelToEdit.name || "",
      passengers: modelToEdit.passengers ?? "",
      rateShape,
      fullDayTiers: modelToEdit.fullDayTiers || emptyStandardRates.fullDayTiers,
      halfDay: modelToEdit.halfDay || emptyStandardRates.halfDay,
      hourly: modelToEdit.hourly || emptyStandardRates.hourly,
      cityTransfer: modelToEdit.cityTransfer || emptyStandardRates.cityTransfer,
      airportTransfer:
        modelToEdit.airportTransfer || emptyStandardRates.airportTransfer,
      extraPerKm: modelToEdit.extraPerKm ?? "",
      extraHourlyCharge: modelToEdit.extraHourlyCharge ?? "",
      hourTiers: modelToEdit.hourTiers || emptyCoachRates.hourTiers,
      transfer: modelToEdit.transfer || emptyCoachRates.transfer,
    };
  }
  return {
    classId: "",
    name: "",
    passengers: "",
    rateShape: "standard",
    ...emptyStandardRates,
    ...emptyCoachRates,
  };
}

export function VehicleModelModal({
  isOpen,
  onClose,
  modelToEdit,
  vehicleClasses,
  defaultClassId,
  onSuccess,
}) {
  const [form, setForm] = useState(() => {
    const initial = buildInitialForm(modelToEdit);
    if (!modelToEdit && defaultClassId) initial.classId = defaultClassId;
    return initial;
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNestedChange = (field, subField, value) => {
    setForm({ ...form, [field]: { ...form[field], [subField]: value } });
  };

  const handleTierChange = (field, index, subField, value) => {
    const tiers = [...form[field]];
    tiers[index] = { ...tiers[index], [subField]: value };
    setForm({ ...form, [field]: tiers });
  };

  const addTier = (field) => {
    setForm({
      ...form,
      [field]: [...form[field], { hours: "", amount: "" }],
    });
  };

  const removeTier = (field, index) => {
    setForm({
      ...form,
      [field]: form[field].filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.classId) {
      toast.error("Please select a vehicle class");
      return;
    }
    setSaving(true);
    try {
      let payload;
      if (form.rateShape === "coach") {
        payload = {
          classId: form.classId,
          name: form.name,
          passengers: form.passengers ? Number(form.passengers) : null,
          rateShape: "coach",
          hourTiers: form.hourTiers.map((t) => ({
            hours: Number(t.hours) || 0,
            amount: Number(t.amount) || 0,
          })),
          transfer: { amount: Number(form.transfer.amount) || 0 },
          extraHourlyCharge: Number(form.extraHourlyCharge) || 0,
        };
      } else {
        payload = {
          classId: form.classId,
          name: form.name,
          passengers: form.passengers ? Number(form.passengers) : null,
          rateShape: "standard",
          fullDayTiers: form.fullDayTiers.map((t) => ({
            hours: Number(t.hours) || 0,
            amount: Number(t.amount) || 0,
          })),
          halfDay: {
            hours: Number(form.halfDay.hours) || 0,
            amount: Number(form.halfDay.amount) || 0,
          },
          hourly: {
            amount: Number(form.hourly.amount) || 0,
            minHours: Number(form.hourly.minHours) || 0,
          },
          cityTransfer: { amount: Number(form.cityTransfer.amount) || 0 },
          airportTransfer: {
            amount: Number(form.airportTransfer.amount) || 0,
            maxKm: Number(form.airportTransfer.maxKm) || 0,
          },
          extraPerKm: Number(form.extraPerKm) || 0,
          extraHourlyCharge: Number(form.extraHourlyCharge) || 0,
        };
      }

      let newId = modelToEdit?.id;
      if (modelToEdit) {
        await updateVehicleModel(modelToEdit.id, payload);
        toast.success("Vehicle model updated");
      } else {
        const docRef = await addVehicleModel(payload);
        newId = docRef.id;
        toast.success("Vehicle model added");
      }
      onSuccess(newId);
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving vehicle model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={modelToEdit ? "Edit Vehicle Model" : "Add Vehicle Model"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Class <span className="text-red-500">*</span>
          </label>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. GMC Yukon XL"
            required
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
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rate Shape <span className="text-red-500">*</span>
          </label>
          <select
            name="rateShape"
            value={form.rateShape}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="standard">
              Standard (Full/Half Day, Hourly, City/Airport Transfer)
            </option>
            <option value="coach">Coach (Hour Tiers / Transfer)</option>
          </select>
        </div>

        {form.rateShape === "standard" ? (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Full Day Tiers
                </label>
                <button
                  type="button"
                  onClick={() => addTier("fullDayTiers")}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  + Add Tier
                </button>
              </div>
              {form.fullDayTiers.map((tier, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="Hours"
                    value={tier.hours}
                    onChange={(e) =>
                      handleTierChange(
                        "fullDayTiers",
                        i,
                        "hours",
                        e.target.value,
                      )
                    }
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Amount (SAR)"
                    value={tier.amount}
                    onChange={(e) =>
                      handleTierChange(
                        "fullDayTiers",
                        i,
                        "amount",
                        e.target.value,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {form.fullDayTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier("fullDayTiers", i)}
                      className="px-2 text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Half Day
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Hours"
                  value={form.halfDay.hours}
                  onChange={(e) =>
                    handleNestedChange("halfDay", "hours", e.target.value)
                  }
                  className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Amount (SAR)"
                  value={form.halfDay.amount}
                  onChange={(e) =>
                    handleNestedChange("halfDay", "amount", e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount/hr (SAR)"
                  value={form.hourly.amount}
                  onChange={(e) =>
                    handleNestedChange("hourly", "amount", e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Min hours"
                  value={form.hourly.minHours}
                  onChange={(e) =>
                    handleNestedChange("hourly", "minHours", e.target.value)
                  }
                  className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City Transfer (SAR)
              </label>
              <input
                type="number"
                value={form.cityTransfer.amount}
                onChange={(e) =>
                  handleNestedChange("cityTransfer", "amount", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Airport Transfer
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount (SAR)"
                  value={form.airportTransfer.amount}
                  onChange={(e) =>
                    handleNestedChange(
                      "airportTransfer",
                      "amount",
                      e.target.value,
                    )
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Max km"
                  value={form.airportTransfer.maxKm}
                  onChange={(e) =>
                    handleNestedChange(
                      "airportTransfer",
                      "maxKm",
                      e.target.value,
                    )
                  }
                  className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra / km (SAR)
                </label>
                <input
                  type="number"
                  name="extraPerKm"
                  value={form.extraPerKm}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra Hour Charge (SAR)
                </label>
                <input
                  type="number"
                  name="extraHourlyCharge"
                  value={form.extraHourlyCharge}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Hour Tiers
                </label>
                <button
                  type="button"
                  onClick={() => addTier("hourTiers")}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  + Add Tier
                </button>
              </div>
              {form.hourTiers.map((tier, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="Hours"
                    value={tier.hours}
                    onChange={(e) =>
                      handleTierChange("hourTiers", i, "hours", e.target.value)
                    }
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Amount (SAR)"
                    value={tier.amount}
                    onChange={(e) =>
                      handleTierChange("hourTiers", i, "amount", e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {form.hourTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier("hourTiers", i)}
                      className="px-2 text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transfer Rate (SAR)
              </label>
              <input
                type="number"
                value={form.transfer.amount}
                onChange={(e) =>
                  handleNestedChange("transfer", "amount", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra Hour Charge (SAR)
              </label>
              <input
                type="number"
                name="extraHourlyCharge"
                value={form.extraHourlyCharge}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

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
