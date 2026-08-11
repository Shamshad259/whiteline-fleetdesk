import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { useDrivers } from "../hooks/useDrivers";
import { useTrips } from "../hooks/useTrips";
import { useVehicles } from "../hooks/useVehicles";
import { useVehicleModels } from "../hooks/useVehicleModels";
import { db } from "../firebase";
import { deleteTrip } from "../utils/tripService";
import { TripModal } from "../components/TripModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  deleteInvoiceAndClearTrip,
  generateInvoiceForTrip,
  hasTripChangedSinceInvoice,
} from "../utils/invoiceService";
import { generateInvoicePdf } from "../utils/invoicePdf";
import { updateTripPayment } from "../utils/tripService";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `SAR ${amount.toLocaleString("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    calendar: "gregory",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Trips() {
  const { trips, loading } = useTrips();
  const { drivers, loading: driversLoading } = useDrivers();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { vehicleModels, loading: vehicleModelsLoading } = useVehicleModels();
  const [driverFilter, setDriverFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState(null);
  const [invoicingTripId, setInvoicingTripId] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [paymentStatusDraft, setPaymentStatusDraft] = useState("Paid");
  const [amountPaidDraft, setAmountPaidDraft] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const driverById = useMemo(() => {
    const map = {};
    drivers.forEach((driver) => {
      map[driver.id] = driver;
    });
    return map;
  }, [drivers]);

  const vehicleById = useMemo(() => {
    const map = {};
    vehicles.forEach((vehicle) => {
      map[vehicle.id] = vehicle;
    });
    return map;
  }, [vehicles]);

  const vehicleModelById = useMemo(() => {
    const map = {};
    vehicleModels.forEach((model) => {
      map[model.id] = model;
    });
    return map;
  }, [vehicleModels]);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchesDriver =
        driverFilter === "all" || trip.driverId === driverFilter;
      const matchesPayment =
        paymentFilter === "all" || trip.paymentStatus === paymentFilter;
      const matchesStartDate = !startDate || trip.tripDate >= startDate;
      const matchesEndDate = !endDate || trip.tripDate <= endDate;
      return (
        matchesDriver && matchesPayment && matchesStartDate && matchesEndDate
      );
    });
  }, [trips, driverFilter, paymentFilter, startDate, endDate]);

  const sortedTrips = useMemo(() => {
    return [...filteredTrips].sort((a, b) => {
      const dateA = a.tripDate || "";
      const dateB = b.tripDate || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (
        (b.createdAt?.toDate?.().getTime?.() || 0) -
        (a.createdAt?.toDate?.().getTime?.() || 0)
      );
    });
  }, [filteredTrips]);

  const handleAddClick = () => {
    setTripToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (trip) => {
    setTripToEdit(trip);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteTrip(deleteConfirm.id);
      toast.success("Trip deleted");
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || "Error deleting trip");
    } finally {
      setDeleting(false);
    }
  };

  const handleInvoiceAction = async (trip, includeVat) => {
    if (!trip?.id) return;
    setInvoiceDialog(null);
    setInvoicingTripId(trip.id);

    const vehicle = trip.vehicleId ? vehicleById[trip.vehicleId] : null;
    const vehicleModel = vehicle?.modelId
      ? vehicleModelById[vehicle.modelId]
      : null;
    const vehicleModelName = vehicleModel?.name || "";
    const vehiclePlateNumber = vehicle?.plateNumber || "";

    try {
      if (trip.invoiceId && !hasTripChangedSinceInvoice(trip)) {
        const invoiceDoc = await getDoc(doc(db, "invoices", trip.invoiceId));
        if (!invoiceDoc.exists()) {
          toast.error("Invoice could not be found.");
          return;
        }
        await generateInvoicePdf({ id: invoiceDoc.id, ...invoiceDoc.data() });
        toast.success("Invoice downloaded");
        return;
      }

      if (trip.invoiceId && hasTripChangedSinceInvoice(trip)) {
        await deleteInvoiceAndClearTrip(trip.invoiceId, trip.id);
      }

      const result = await generateInvoiceForTrip(trip, {
        includeVat,
        vehicleModelName,
        vehiclePlateNumber,
      });
      await generateInvoicePdf(result);
      toast.success("Invoice generated");
    } catch (err) {
      toast.error(err.message || "Error generating invoice");
    } finally {
      setInvoicingTripId(null);
    }
  };

  const handleInvoiceClick = (trip) => {
    if (!trip.customerName) return;

    if (!trip.invoiceId) {
      setInvoiceDialog({ type: "vat", trip, mode: "generate" });
      return;
    }

    if (!hasTripChangedSinceInvoice(trip)) {
      handleInvoiceAction(trip, false);
      return;
    }

    setInvoiceDialog({ type: "regenerate", trip, mode: "regenerate" });
  };

  const openPaymentDialog = (trip) => {
    setPaymentDialog(trip);
    setPaymentStatusDraft(trip.paymentStatus || "Unpaid");
    setAmountPaidDraft(
      trip.amountPaid !== undefined && trip.amountPaid !== null
        ? String(trip.amountPaid)
        : "",
    );
  };

  const handleSavePayment = async () => {
    if (!paymentDialog) return;
    setSavingPayment(true);
    try {
      const amountPaid =
        paymentStatusDraft === "Paid"
          ? Number(paymentDialog.amount || 0)
          : paymentStatusDraft === "Unpaid"
            ? 0
            : Number(amountPaidDraft || 0);
      await updateTripPayment(paymentDialog.id, {
        paymentStatus: paymentStatusDraft,
        amountPaid,
      });
      toast.success("Payment updated");
      setPaymentDialog(null);
    } catch (err) {
      toast.error(err.message || "Error updating payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const PaymentBadge = ({ status }) => {
    const classes = {
      Paid: "bg-green-100 text-green-800",
      Partial: "bg-amber-100 text-amber-800",
      Unpaid: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status}
      </span>
    );
  };

  if (loading || driversLoading || vehiclesLoading || vehicleModelsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading trips...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Trips</h1>
        <div className="flex flex-col md:flex-row gap-4 flex-wrap">
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.fullName}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Payment Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={handleAddClick}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            + Add Trip
          </button>
        </div>
      </div>

      {sortedTrips.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No trips found</p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-4">
            {sortedTrips.map((trip) => {
              const driver = driverById[trip.driverId];
              return (
                <div
                  key={trip.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {driver?.fullName || "Unknown driver"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(trip.tripDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => openPaymentDialog(trip)}
                      className="hover:opacity-75"
                    >
                      <PaymentBadge status={trip.paymentStatus} />
                    </button>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Customer:</span>{" "}
                      {trip.customerName || "—"}
                    </p>
                    <p>
                      <span className="font-medium">Service:</span>{" "}
                      {trip.serviceType || "—"}
                      {trip.isCustom ? " · Custom" : ""}
                    </p>
                    <p>
                      <span className="font-medium">Amount:</span>{" "}
                      {formatCurrency(trip.amount)}
                    </p>
                    <p>
                      <span className="font-medium">Expense:</span>{" "}
                      {formatCurrency(trip.expense)}
                    </p>
                    <p>
                      <span className="font-medium">Profit:</span>{" "}
                      {formatCurrency(trip.profit)}
                    </p>
                    {trip.paymentStatus !== "Paid" && (
                      <p>
                        <span className="font-medium">Balance Due:</span>{" "}
                        <span className="text-amber-700 font-semibold">
                          {formatCurrency(
                            Number(trip.amount || 0) -
                              Number(trip.amountPaid || 0),
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                      onClick={() => handleEditClick(trip)}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleInvoiceClick(trip)}
                      disabled={
                        !trip.customerName || invoicingTripId === trip.id
                      }
                      title={
                        !trip.customerName
                          ? "Add a customer to this trip first"
                          : undefined
                      }
                      className="flex-1 px-3 py-1.5 text-sm rounded hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-50 text-amber-700"
                    >
                      {trip.invoiceId && hasTripChangedSinceInvoice(trip)
                        ? "Regenerate Invoice"
                        : trip.invoiceId
                          ? "View Invoice"
                          : "Generate Invoice"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(trip)}
                      className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full bg-white rounded-lg border border-gray-200">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Driver
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Service
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Expense
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Profit
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Payment
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Balance Due
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTrips.map((trip) => {
                  const driver = driverById[trip.driverId];
                  return (
                    <tr key={trip.id} className="border-b border-gray-200">
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {formatDate(trip.tripDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {driver?.fullName || "Unknown driver"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {trip.customerName || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {trip.serviceType || "—"}
                        {trip.isCustom ? " · Custom" : ""}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {formatCurrency(trip.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {formatCurrency(trip.expense)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {formatCurrency(trip.profit)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        <button
                          onClick={() => openPaymentDialog(trip)}
                          className="hover:opacity-75"
                        >
                          <PaymentBadge status={trip.paymentStatus} />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {trip.paymentStatus !== "Paid" ? (
                          <span className="text-amber-700 font-semibold">
                            {formatCurrency(
                              Number(trip.amount || 0) -
                                Number(trip.amountPaid || 0),
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => handleEditClick(trip)}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleInvoiceClick(trip)}
                            disabled={
                              !trip.customerName || invoicingTripId === trip.id
                            }
                            title={
                              !trip.customerName
                                ? "Add a customer to this trip first"
                                : undefined
                            }
                            className="px-3 py-1.5 text-sm rounded hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-50 text-amber-700"
                          >
                            {trip.invoiceId && hasTripChangedSinceInvoice(trip)
                              ? "Regenerate Invoice"
                              : trip.invoiceId
                                ? "View Invoice"
                                : "Generate Invoice"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(trip)}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <TripModal
          key={tripToEdit?.id || "new"}
          isOpen={isModalOpen}
          onClose={() => {
            setTripToEdit(null);
            setIsModalOpen(false);
          }}
          tripToEdit={tripToEdit}
          onSuccess={() => {
            setTripToEdit(null);
            setIsModalOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title="Delete trip"
        message="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(invoiceDialog && invoiceDialog.type === "regenerate")}
        title="Regenerate invoice?"
        message="This trip has changed since its invoice was generated. The old invoice will be deleted."
        confirmText="Continue"
        cancelText="Cancel"
        loading={invoicingTripId === invoiceDialog?.trip?.id}
        onConfirm={() => {
          if (invoiceDialog?.trip) {
            setInvoiceDialog({
              type: "vat",
              trip: invoiceDialog.trip,
              mode: "regenerate",
            });
          }
        }}
        onCancel={() => setInvoiceDialog(null)}
      />

      {paymentDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Update Payment
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={paymentStatusDraft}
                  onChange={(e) => setPaymentStatusDraft(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              {paymentStatusDraft === "Partial" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaidDraft}
                    onChange={(e) => setAmountPaidDraft(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Trip total: {formatCurrency(paymentDialog.amount)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setPaymentDialog(null)}
                disabled={savingPayment}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                disabled={savingPayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingPayment ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {invoiceDialog && invoiceDialog.type === "vat" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Include 15% VAT?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Would you like to include 15% VAT on this invoice?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleInvoiceAction(invoiceDialog.trip, true)}
                disabled={invoicingTripId === invoiceDialog?.trip?.id}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Yes, include VAT
              </button>
              <button
                onClick={() => handleInvoiceAction(invoiceDialog.trip, false)}
                disabled={invoicingTripId === invoiceDialog?.trip?.id}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                No, exclude VAT
              </button>
              <button
                onClick={() => setInvoiceDialog(null)}
                disabled={invoicingTripId === invoiceDialog?.trip?.id}
                className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
