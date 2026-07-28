import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useRates } from "../hooks/useRates";
import { deleteRate } from "../utils/rateService";
import { RateModal } from "../components/RateModal";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function Rates() {
  const { rates, loading } = useRates();
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rateToEdit, setRateToEdit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const vehicleTypes = useMemo(() => {
    const types = new Set(rates.map((r) => r.vehicleType).filter(Boolean));
    return Array.from(types);
  }, [rates]);

  const filteredRates = useMemo(() => {
    return rates.filter((r) =>
      vehicleFilter === "all" ? true : r.vehicleType === vehicleFilter,
    );
  }, [rates, vehicleFilter]);

  const handleAddClick = () => {
    setRateToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (rate) => {
    setRateToEdit(rate);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteRate(deleteConfirm.id);
      toast.success("Rate deleted");
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || "Error deleting rate");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading rates...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Rate Management
        </h1>
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Vehicle Types</option>
            {vehicleTypes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddClick}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap md:ml-auto"
          >
            + Add Rate
          </button>
        </div>
      </div>

      {filteredRates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No rates set up yet</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredRates.map((rate) => (
              <div
                key={rate.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {rate.serviceType}
                  </p>
                  <p className="text-sm text-gray-600">{rate.vehicleType}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">SAR {rate.rate}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEditClick(rate)}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(rate)}
                      className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full bg-white rounded-lg border border-gray-200">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Service Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Vehicle Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Rate (SAR)
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.map((rate) => (
                  <tr
                    key={rate.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {rate.serviceType}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {rate.vehicleType}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-600">
                      SAR {rate.rate}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(rate)}
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(rate)}
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <RateModal
          key={rateToEdit?.id || "new"}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setRateToEdit(null);
          }}
          rateToEdit={rateToEdit}
          onSuccess={() => setRateToEdit(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Rate"
        message={`Delete the ${deleteConfirm?.serviceType} rate for ${deleteConfirm?.vehicleType}?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
