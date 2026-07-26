import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useVehicles } from "../hooks/useVehicles";
import { deleteVehicle } from "../utils/vehicleService";
import { VehicleModal } from "../components/VehicleModal";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function Vehicles() {
  const { vehicles, loading } = useVehicles();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const vehicleTypes = useMemo(() => {
    const types = new Set(vehicles.map((v) => v.type).filter(Boolean));
    return Array.from(types);
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => (typeFilter === "all" ? true : v.type === typeFilter))
      .filter((v) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          v.make?.toLowerCase().includes(q) ||
          v.model?.toLowerCase().includes(q) ||
          v.plateNumber?.toLowerCase().includes(q)
        );
      });
  }, [vehicles, typeFilter, searchQuery]);

  const handleAddClick = () => {
    setVehicleToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (vehicle) => {
    setVehicleToEdit(vehicle);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteVehicle(deleteConfirm.id);
      toast.success("Vehicle deleted");
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || "Error deleting vehicle");
    } finally {
      setDeleting(false);
    }
  };

  const OwnerBadge = ({ ownerType }) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        ownerType === "company"
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {ownerType === "company" ? "Company Owned" : "Driver Owned"}
    </span>
  );

  const StatusBadge = ({ status }) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        status === "active"
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading vehicles...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Vehicles</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by make, model, or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Types</option>
            {vehicleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddClick}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No vehicles found</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-gray-600">
                      {vehicle.plateNumber}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {vehicle.type}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3 text-sm">
                  <OwnerBadge ownerType={vehicle.ownerType} />
                  <StatusBadge status={vehicle.status} />
                </div>
                <div className="flex gap-2 mt-4">
                  {vehicle.ownerType === "company" && (
                    <button
                      onClick={() => handleEditClick(vehicle)}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(vehicle)}
                    className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                  >
                    Delete
                  </button>
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
                    Make / Model
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Plate Number
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Owner
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {vehicle.make} {vehicle.model}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {vehicle.plateNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {vehicle.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <OwnerBadge ownerType={vehicle.ownerType} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={vehicle.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {vehicle.ownerType === "company" && (
                          <button
                            onClick={() => handleEditClick(vehicle)}
                            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(vehicle)}
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
        <VehicleModal
          key={vehicleToEdit?.id || "new"}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setVehicleToEdit(null);
          }}
          vehicleToEdit={vehicleToEdit}
          onSuccess={() => setVehicleToEdit(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Vehicle"
        message={`Delete ${deleteConfirm?.make} ${deleteConfirm?.model} (${deleteConfirm?.plateNumber})?`}
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
