import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCustomerProfile } from "../hooks/useCustomers";
import { useDrivers } from "../hooks/useDrivers";
import { useVehicles } from "../hooks/useVehicles";
import { useVehicleModels } from "../hooks/useVehicleModels";
import { CustomerModal } from "../components/CustomerModal";
import { ModalShell } from "../components/ModalShell";
import {
  generateBulkInvoiceForTrips,
  hasTripChangedSinceInvoice,
} from "../utils/invoiceService";
import { generateBulkInvoicePdf } from "../utils/invoicePdf";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `SAR ${amount.toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`text-lg font-semibold ${highlight ? "text-amber-600" : "text-gray-800"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-green-100 text-green-700",
    Partial: "bg-amber-100 text-amber-700",
    Unpaid: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status || "—"}
    </span>
  );
}

export function CustomerProfile() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { customer, trips, loading, error } = useCustomerProfile(customerId);
  const { drivers } = useDrivers();
  const { vehicles } = useVehicles();
  const { vehicleModels } = useVehicleModels();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [selectedTripIds, setSelectedTripIds] = useState(new Set());
  const [includeVat, setIncludeVat] = useState(true);
  const [generatingBulk, setGeneratingBulk] = useState(false);

  const vehicleById = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => (map[v.id] = v));
    return map;
  }, [vehicles]);

  const vehicleModelById = useMemo(() => {
    const map = {};
    vehicleModels.forEach((m) => (map[m.id] = m));
    return map;
  }, [vehicleModels]);

  const bulkCandidateTrips = useMemo(() => {
    return trips
      .filter((t) => {
        if (!bulkStartDate && !bulkEndDate) return true;
        const matchesStart = !bulkStartDate || t.tripDate >= bulkStartDate;
        const matchesEnd = !bulkEndDate || t.tripDate <= bulkEndDate;
        return matchesStart && matchesEnd;
      })
      .sort((a, b) => (a.tripDate || "").localeCompare(b.tripDate || ""));
  }, [trips, bulkStartDate, bulkEndDate]);

  const openBulkModal = () => {
    setBulkStartDate("");
    setBulkEndDate("");
    setIncludeVat(true);
    setIsBulkOpen(true);
  };

  const candidateTripsKey = bulkCandidateTrips.map((t) => t.id).join(",");
  const [lastAutoSelectedKey, setLastAutoSelectedKey] = useState(null);

  if (lastAutoSelectedKey !== candidateTripsKey) {
    setLastAutoSelectedKey(candidateTripsKey);
    const eligibleIds = bulkCandidateTrips
      .filter((t) => !t.invoiceId || hasTripChangedSinceInvoice(t))
      .map((t) => t.id);
    setSelectedTripIds(new Set(eligibleIds));
  }

  const toggleTripSelection = (tripId) => {
    setSelectedTripIds((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) next.delete(tripId);
      else next.add(tripId);
      return next;
    });
  };

  const selectedTrips = bulkCandidateTrips.filter((t) =>
    selectedTripIds.has(t.id),
  );
  const selectedSubtotal = selectedTrips.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0,
  );

  const handleGenerateBulkInvoice = async () => {
    if (selectedTrips.length === 0) {
      toast.error("Select at least one trip to invoice");
      return;
    }
    setGeneratingBulk(true);
    try {
      const tripsWithVehicleInfo = selectedTrips.map((trip) => {
        const vehicle = trip.vehicleId ? vehicleById[trip.vehicleId] : null;
        const model = vehicle?.modelId
          ? vehicleModelById[vehicle.modelId]
          : null;
        return {
          ...trip,
          vehicleModelName: model?.name || "",
          vehiclePlateNumber: vehicle?.plateNumber || "",
        };
      });

      const result = await generateBulkInvoiceForTrips(
        customer,
        tripsWithVehicleInfo,
        { includeVat },
      );
      await generateBulkInvoicePdf(result);
      toast.success("Bulk invoice generated");
      setIsBulkOpen(false);
    } catch (err) {
      toast.error(err.message || "Error generating bulk invoice");
    } finally {
      setGeneratingBulk(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const driverName = (driverId) =>
    drivers.find((d) => d.id === driverId)?.fullName || "—";

  const totalRevenue = trips.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0,
  );
  const totalExpense = trips.reduce(
    (sum, t) => sum + (Number(t.expense) || 0),
    0,
  );
  const outstanding = trips
    .filter(
      (t) => t.paymentStatus === "Partial" || t.paymentStatus === "Unpaid",
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return (
    <div className="p-4 md:p-6">
      <button
        onClick={() => navigate("/customers")}
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 mb-4"
      >
        <span aria-hidden="true">&larr;</span> Back to Customers
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {customer.fullName}
          </h1>
          <p className="text-gray-500">
            {customer.code || (
              <span className="text-amber-600">No code assigned</span>
            )}
            {customer.phone ? ` · ${customer.phone}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openBulkModal}
            className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
          >
            Generate Bulk Invoice
          </button>
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Trips" value={trips.length} />
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <StatCard
          label="Total Profit"
          value={formatCurrency(totalRevenue - totalExpense)}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          highlight={outstanding > 0}
        />
      </div>

      <h2 className="text-sm font-medium text-gray-600 mb-2">Trip History</h2>

      {trips.length === 0 ? (
        <p className="text-gray-500">
          No trips recorded for this customer yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Date
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Driver
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Service
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">
                  Amount
                </th>
                <th className="px-4 py-2 text-center font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-2 text-center font-medium text-gray-600">
                  Invoiced
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trips.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">{t.tripDate}</td>
                  <td className="px-4 py-2">{driverName(t.driverId)}</td>
                  <td className="px-4 py-2">
                    {t.isCustom ? t.customDescription : t.serviceType}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <StatusBadge status={t.paymentStatus} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    {t.invoiceId ? (
                      <span className="text-green-600 text-xs font-medium">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isEditOpen && (
        <CustomerModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          customerToEdit={customer}
          onSuccess={() => setIsEditOpen(false)}
        />
      )}

      {isBulkOpen && (
        <ModalShell
          title={`Bulk Invoice — ${customer.fullName}`}
          onClose={() => setIsBulkOpen(false)}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={(e) => setBulkEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {bulkCandidateTrips.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No trips found in the selected range.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y max-h-80 overflow-y-auto">
                {bulkCandidateTrips.map((trip) => {
                  const alreadyInvoiced =
                    trip.invoiceId && !hasTripChangedSinceInvoice(trip);
                  return (
                    <div
                      key={trip.id}
                      className={`flex items-center gap-3 p-3 ${
                        alreadyInvoiced ? "bg-gray-50 opacity-60" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTripIds.has(trip.id)}
                        disabled={alreadyInvoiced}
                        onChange={() => toggleTripSelection(trip.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {trip.tripDate} —{" "}
                          {trip.isCustom
                            ? trip.customDescription
                            : trip.serviceType}
                        </p>
                        {alreadyInvoiced && (
                          <p className="text-xs text-amber-700">
                            Already invoiced individually
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(trip.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeVat}
                onChange={(e) => setIncludeVat(e.target.checked)}
              />
              Include 15% VAT
            </label>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Selected trips</span>
                <span>{selectedTrips.length}</span>
              </div>
              <div className="flex justify-between font-semibold mt-1">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedSubtotal)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateBulkInvoice}
                disabled={generatingBulk || selectedTrips.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingBulk ? "Generating..." : "Generate Invoice"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
