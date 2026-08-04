import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomersWithStats } from "../hooks/useCustomers";
import { CustomerModal } from "../components/CustomerModal";
import { deleteCustomer } from "../utils/customerService";
import { ConfirmDialog } from "../components/ConfirmDialog";
import toast from "react-hot-toast";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `SAR ${amount.toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function Customers() {
  const { customers, loading } = useCustomersWithStats();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    );
  }, [customers, search]);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading customers...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
            className="px-4 py-2 border border-gray-300 rounded-lg w-full md:w-64"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            + Add Customer
          </button>
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <p className="text-gray-500">
          {search
            ? "No customers match your search."
            : "No customers yet. Add one, or they'll be created automatically from the Trip form."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Name
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Phone
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">
                  Trips
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">
                  Total Revenue
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">
                  Outstanding
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {c.fullName}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.phone || "—"}</td>
                  <td className="px-4 py-2 text-right">{c.tripCount}</td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(c.totalRevenue)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right ${c.outstanding > 0 ? "text-amber-600 font-medium" : "text-gray-400"}`}
                  >
                    {formatCurrency(c.outstanding)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(c);
                      }}
                      className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <CustomerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title="Delete customer"
        message={
          deleteConfirm?.tripCount > 0
            ? `${deleteConfirm.fullName} has ${deleteConfirm.tripCount} trip(s) on record. Deleting them only removes the customer entry — trip history stays, but you won't be able to view their profile again. Continue?`
            : "This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteCustomer(deleteConfirm.id);
            toast.success("Customer deleted");
            setDeleteConfirm(null);
          } catch (err) {
            toast.error(err.message || "Error deleting customer");
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
