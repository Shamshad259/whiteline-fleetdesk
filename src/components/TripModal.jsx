import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ModalShell } from "./ModalShell";
import { useDrivers } from "../hooks/useDrivers";
import { useVehicles } from "../hooks/useVehicles";
import { useVehicleModels } from "../hooks/useVehicleModels";
import { useCustomers } from "../hooks/useCustomers";
import { addTrip, updateTrip } from "../utils/tripService";
import { addCustomer } from "../utils/customerService";

const initialForm = {
  driverId: "",
  customerName: "",
  customerId: "",
  customerPhone: "",
  customerEmail: "",
  serviceType: "",
  selectedTier: "",
  customDescription: "",
  amount: "",
  rateManuallyAdjusted: false,
  expense: "",
  paymentStatus: "Paid",
  amountPaid: "",
  tripDate: new Date().toISOString().slice(0, 10),
  notes: "",
  extraKmEnabled: false,
  extraKmQty: "",
  extraHourEnabled: false,
  extraHourQty: "",
};

function getServiceTypeOptions(model) {
  if (!model) return [];
  if (model.rateShape === "standard") {
    return [
      "Full Day",
      "Half Day",
      "Hourly",
      "City Transfer",
      "Airport Transfer",
      "Custom / Other",
    ];
  }
  if (model.rateShape === "coach") {
    return ["Hourly Package", "Transfer", "Custom / Other"];
  }
  return ["Custom / Other"];
}

function getTierOptions(model, serviceType) {
  if (!model) return [];
  if (serviceType === "Full Day" && Array.isArray(model.fullDayTiers)) {
    return model.fullDayTiers;
  }
  if (serviceType === "Hourly Package" && Array.isArray(model.hourTiers)) {
    return model.hourTiers;
  }
  return [];
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `SAR ${amount.toLocaleString("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatTierLabel(tier) {
  return tier ? `${tier.hours} hours - ${formatCurrency(tier.amount)}` : "";
}

function buildBaseAmount(model, serviceType, selectedTier) {
  if (!model) return 0;
  if (serviceType === "Full Day") {
    const tier = selectedTier
      ? model.fullDayTiers?.find((item) => item.hours === Number(selectedTier))
      : null;
    return tier?.amount || model.fullDayTiers?.[0]?.amount || 0;
  }
  if (serviceType === "Half Day") {
    return model.halfDay?.amount || 0;
  }
  if (serviceType === "Hourly") {
    return model.hourly?.amount || 0;
  }
  if (serviceType === "City Transfer") {
    return model.cityTransfer?.amount || 0;
  }
  if (serviceType === "Airport Transfer") {
    return model.airportTransfer?.amount || 0;
  }
  if (serviceType === "Hourly Package") {
    const tier = selectedTier
      ? model.hourTiers?.find((item) => item.hours === Number(selectedTier))
      : null;
    return tier?.amount || model.hourTiers?.[0]?.amount || 0;
  }
  if (serviceType === "Transfer") {
    return model.transfer?.amount || 0;
  }
  return 0;
}

export function TripModal({ isOpen, onClose, tripToEdit, onSuccess }) {
  const { drivers } = useDrivers();
  const { vehicles } = useVehicles();
  const { vehicleModels } = useVehicleModels();
  const { customers } = useCustomers();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    ...tripToEdit,
    selectedTier: tripToEdit?.tierHours ?? "",
    tripDate: tripToEdit?.tripDate || new Date().toISOString().slice(0, 10),
    amount: tripToEdit?.amount ?? "",
    amountPaid: tripToEdit?.amountPaid ?? "",
    expense: tripToEdit?.expense ?? "",
    extraKmEnabled: tripToEdit?.addOns?.extraKm?.enabled || false,
    extraKmQty: tripToEdit?.addOns?.extraKm?.qty ?? "",
    extraHourEnabled: tripToEdit?.addOns?.extraHour?.enabled || false,
    extraHourQty: tripToEdit?.addOns?.extraHour?.qty ?? "",
    rateManuallyAdjusted: tripToEdit?.rateManuallyAdjusted || false,
  }));
  const [saving, setSaving] = useState(false);
  const [suppressDropdown, setSuppressDropdown] = useState(false);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === form.driverId) || null,
    [drivers, form.driverId],
  );

  const selectedVehicle = useMemo(() => {
    if (!selectedDriver?.vehicleId) return null;
    return (
      vehicles.find((vehicle) => vehicle.id === selectedDriver.vehicleId) ||
      null
    );
  }, [selectedDriver, vehicles]);

  const selectedModel = useMemo(() => {
    if (!selectedVehicle?.modelId) return null;
    return (
      vehicleModels.find((model) => model.id === selectedVehicle.modelId) ||
      null
    );
  }, [selectedVehicle, vehicleModels]);

  const serviceOptions = useMemo(
    () => getServiceTypeOptions(selectedModel),
    [selectedModel],
  );
  const tierOptions = useMemo(
    () => getTierOptions(selectedModel, form.serviceType),
    [selectedModel, form.serviceType],
  );

  const filteredCustomers = useMemo(() => {
    const query = form.customerName?.toLowerCase().trim() || "";
    if (!query) return [];
    return customers.filter((customer) =>
      customer.fullName?.toLowerCase().includes(query),
    );
  }, [customers, form.customerName]);

  const customerOptions = useMemo(
    () => (suppressDropdown ? [] : filteredCustomers.slice(0, 6)),
    [filteredCustomers, suppressDropdown],
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === "customerName") {
      setForm((prev) => ({ ...prev, customerName: value, customerId: "" }));
      setSuppressDropdown(false);
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectCustomer = (customer) => {
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.fullName,
    }));
    setSuppressDropdown(true);
  };

  const handleAmountChange = (e) => {
    setForm((prev) => ({
      ...prev,
      amount: e.target.value,
      rateManuallyAdjusted: true,
    }));
  };

  const computedAmount = useMemo(() => {
    const baseAmount = buildBaseAmount(
      selectedModel,
      form.serviceType,
      form.selectedTier,
    );
    const extraKmAmount =
      form.extraKmEnabled && form.extraKmQty
        ? Number(form.extraKmQty) * (selectedModel?.extraPerKm || 0)
        : 0;
    const extraHourAmount =
      form.extraHourEnabled && form.extraHourQty
        ? Number(form.extraHourQty) * (selectedModel?.extraHourlyCharge || 0)
        : 0;
    return baseAmount + extraKmAmount + extraHourAmount;
  }, [
    selectedModel,
    form.serviceType,
    form.selectedTier,
    form.extraKmEnabled,
    form.extraKmQty,
    form.extraHourEnabled,
    form.extraHourQty,
  ]);

  const computedProfit = Number(form.amount || 0) - Number(form.expense || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver) {
      toast.error("Please select a driver first");
      return;
    }
    if (!selectedVehicle) {
      toast.error("The selected driver has no assigned vehicle");
      return;
    }
    if (!selectedModel) {
      toast.error("The selected vehicle has no model assigned");
      return;
    }

    setSaving(true);
    try {
      const customerName = form.customerName?.trim();
      let customerId = form.customerId || "";

      if (customerName) {
        if (!customerId) {
          const newCustomer = await addCustomer({
            fullName: customerName,
            phone: form.customerPhone?.trim() || "",
            email: form.customerEmail?.trim() || "",
          });
          customerId = newCustomer.id;
        }
      }

      const payload = {
        driverId: selectedDriver.id,
        vehicleId: selectedVehicle.id,
        modelId: selectedModel.id,
        customerId,
        customerName: customerName || "",
        tripDate: form.tripDate,
        serviceType: form.serviceType,
        tierHours: form.selectedTier || null,
        isCustom: form.serviceType === "Custom / Other",
        customDescription:
          form.serviceType === "Custom / Other" ? form.customDescription : "",
        amount: Number(form.amount || computedAmount || 0),
        rateManuallyAdjusted: form.rateManuallyAdjusted,
        addOns: {
          extraKm: form.extraKmEnabled
            ? {
                enabled: true,
                qty: Number(form.extraKmQty || 0),
                rate: selectedModel?.extraPerKm || 0,
              }
            : null,
          extraHour: form.extraHourEnabled
            ? {
                enabled: true,
                qty: Number(form.extraHourQty || 0),
                rate: selectedModel?.extraHourlyCharge || 0,
              }
            : null,
        },
        expense: Number(form.expense || 0),
        paymentStatus: form.paymentStatus,
        amountPaid:
          form.paymentStatus === "Paid"
            ? Number(form.amount || computedAmount || 0)
            : form.paymentStatus === "Unpaid"
              ? 0
              : Number(form.amountPaid || 0),
        profit:
          Number(form.amount || computedAmount || 0) -
          Number(form.expense || 0),
        notes: form.notes,
      };

      if (tripToEdit) {
        await updateTrip(tripToEdit.id, payload);
        toast.success("Trip updated");
      } else {
        await addTrip(payload);
        toast.success("Trip added");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving trip");
    } finally {
      setSaving(false);
    }
  };

  const showExtraKm =
    ["City Transfer", "Airport Transfer"].includes(form.serviceType) ||
    form.serviceType === "Transfer";
  const showExtraHour = [
    "Full Day",
    "Half Day",
    "Hourly",
    "Hourly Package",
  ].includes(form.serviceType);
  const showTierSelector =
    (form.serviceType === "Full Day" ||
      form.serviceType === "Hourly Package") &&
    tierOptions.length > 1;
  const showCustomFields = form.serviceType === "Custom / Other";

  if (!isOpen) return null;

  return (
    <ModalShell
      title={tripToEdit ? "Edit Trip" : "Add Trip"}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Driver
          </label>
          <select
            name="driverId"
            value={form.driverId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.fullName}
              </option>
            ))}
          </select>
          {selectedDriver && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              {selectedVehicle && selectedModel ? (
                <span>
                  Vehicle: {selectedModel.name} - {selectedVehicle.plateNumber}
                </span>
              ) : (
                <span className="text-amber-700">
                  No vehicle assigned to this driver. Complete the vehicle
                  assignment first.
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer
          </label>
          <div className="relative">
            <input
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Search or type a customer name"
            />
            {customerOptions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-sm">
                {customerOptions.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {`${customer.fullName || "Unnamed customer"}${customer.code ? ` (${customer.code})` : ""}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!form.customerId && form.customerName && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="Phone (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                name="customerEmail"
                type="email"
                value={form.customerEmail}
                onChange={handleChange}
                placeholder="Email (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Type
          </label>
          <select
            name="serviceType"
            value={form.serviceType}
            onChange={handleChange}
            disabled={!selectedModel}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
          >
            <option value="">Select service type</option>
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {showTierSelector && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tier
            </label>
            <select
              name="selectedTier"
              value={form.selectedTier}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select tier</option>
              {tierOptions.map((tier) => (
                <option key={tier.hours} value={tier.hours}>
                  {formatTierLabel(tier)}
                </option>
              ))}
            </select>
          </div>
        )}

        {!showCustomFields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showExtraKm && (
              <div className="rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="extraKmEnabled"
                    checked={form.extraKmEnabled}
                    onChange={handleChange}
                  />
                  Extra KM
                </label>
                {form.extraKmEnabled && (
                  <input
                    type="number"
                    name="extraKmQty"
                    value={form.extraKmQty}
                    onChange={handleChange}
                    min="0"
                    placeholder="Qty"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                )}
              </div>
            )}
            {showExtraHour && (
              <div className="rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="extraHourEnabled"
                    checked={form.extraHourEnabled}
                    onChange={handleChange}
                  />
                  Extra Hour
                </label>
                {form.extraHourEnabled && (
                  <input
                    type="number"
                    name="extraHourQty"
                    value={form.extraHourQty}
                    onChange={handleChange}
                    min="0"
                    placeholder="Qty"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {showCustomFields && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="customDescription"
                value={form.customDescription}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount{" "}
              {form.rateManuallyAdjusted ? (
                <span className="text-xs text-amber-700">
                  (rate manually adjusted)
                </span>
              ) : (
                ""
              )}
            </label>
            <input
              type="number"
              name="amount"
              value={
                form.rateManuallyAdjusted ? form.amount : computedAmount || ""
              }
              onChange={handleAmountChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {!showCustomFields && (
              <p className="mt-1 text-xs text-gray-500">
                Auto-filled from rate card: {formatCurrency(computedAmount)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense
            </label>
            <input
              type="number"
              name="expense"
              value={form.expense}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <span>Profit</span>
            <span className="font-semibold">
              {formatCurrency(computedProfit)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              name="paymentStatus"
              value={form.paymentStatus}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>
            {form.paymentStatus === "Partial" && (
              <input
                type="number"
                name="amountPaid"
                value={form.amountPaid}
                onChange={handleChange}
                min="0"
                placeholder="Amount paid so far"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trip Date
            </label>
            <input
              type="date"
              name="tripDate"
              value={form.tripDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
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
