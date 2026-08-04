import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomerProfile } from "../hooks/useCustomers";
import { useDrivers } from "../hooks/useDrivers";
import { CustomerModal } from "../components/CustomerModal";

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
  const [isEditOpen, setIsEditOpen] = useState(false);

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
            {customer.phone || "No phone on file"}
          </p>
        </div>
        <button
          onClick={() => setIsEditOpen(true)}
          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
        >
          Edit
        </button>
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
    </div>
  );
}
