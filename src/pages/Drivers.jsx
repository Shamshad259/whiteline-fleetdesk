import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useDrivers } from "../hooks/useDrivers";
import { useVehicles } from "../hooks/useVehicles";
import { deleteDriver } from "../utils/driverService";
import { deleteVehicle } from "../utils/vehicleService";
import { DriverModal } from "../components/DriverModal";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function Drivers() {
  const { drivers, loading } = useDrivers();
  const { vehicles } = useVehicles();
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [driverTypeFilter, setDriverTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [vehicleDeleteConfirm, setVehicleDeleteConfirm] = useState(null);
  const [deletingVehicle, setDeletingVehicle] = useState(false);

  const vehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {
      map[v.id] = v;
    });
    return map;
  }, [vehicles]);

  const vehicleTypes = useMemo(() => {
    const types = new Set(vehicles.map((v) => v.type).filter(Boolean));
    return Array.from(types);
  }, [vehicles]);

  const filteredDrivers = useMemo(() => {
    return drivers
      .filter((d) => {
        if (vehicleTypeFilter === "all") return true;
        const vehicle = vehicleMap[d.vehicleId];
        return vehicle?.type === vehicleTypeFilter;
      })
      .filter((d) =>
        driverTypeFilter === "all" ? true : d.driverType === driverTypeFilter,
      )
      .filter((d) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          d.fullName?.toLowerCase().includes(q) ||
          d.phone?.toLowerCase().includes(q)
        );
      });
  }, [drivers, vehicleMap, vehicleTypeFilter, driverTypeFilter, searchQuery]);

  const handleAddClick = () => {
    setDriverToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (driver) => {
    setDriverToEdit(driver);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteDriver(deleteConfirm.id);
      toast.success("Driver deleted");
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || "Error deleting driver");
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDeleteVehicle = async () => {
    setDeletingVehicle(true);
    try {
      await deleteVehicle(vehicleDeleteConfirm.id);
      toast.success("Vehicle deleted");
      setVehicleDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || "Error deleting vehicle");
    } finally {
      setDeletingVehicle(false);
    }
  };

  const DriverTypeBadge = ({ type }) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        type === "in-house"
          ? "bg-blue-100 text-blue-800"
          : "bg-purple-100 text-purple-800"
      }`}
    >
      {type === "in-house" ? "In-House" : "Freelance"}
    </span>
  );

  const renderVehicleInfo = (driver) => {
    const vehicle = vehicleMap[driver.vehicleId];
    if (!vehicle) {
      return (
        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
          No vehicle
        </span>
      );
    }
    return (
      <div>
        <p className="font-medium text-gray-900 text-sm">
          {vehicle.make} {vehicle.model}
        </p>
        <p className="text-xs text-gray-500">
          {vehicle.plateNumber} · {vehicle.type}
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading drivers...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Drivers</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Vehicle Types</option>
            {vehicleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={driverTypeFilter}
            onChange={(e) => setDriverTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Driver Types</option>
            <option value="in-house">In-House</option>
            <option value="freelance">Freelance</option>
          </select>
          <button
            onClick={handleAddClick}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            + Add Driver
          </button>
        </div>
      </div>

      {filteredDrivers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No drivers found</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{driver.fullName}</p>
                    <p className="text-sm text-gray-600">{driver.phone}</p>
                  </div>
                  <DriverTypeBadge type={driver.driverType} />
                </div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  {renderVehicleInfo(driver)}
                  {vehicleMap[driver.vehicleId]?.ownerType === "driver" && (
                    <button
                      onClick={() =>
                        setVehicleDeleteConfirm(vehicleMap[driver.vehicleId])
                      }
                      className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 whitespace-nowrap"
                    >
                      Delete Vehicle
                    </button>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEditClick(driver)}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(driver)}
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
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Phone
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Driver Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Vehicle
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {driver.fullName}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{driver.phone}</td>
                    <td className="py-3 px-4">
                      <DriverTypeBadge type={driver.driverType} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {renderVehicleInfo(driver)}
                        {vehicleMap[driver.vehicleId]?.ownerType ===
                          "driver" && (
                          <button
                            onClick={() =>
                              setVehicleDeleteConfirm(
                                vehicleMap[driver.vehicleId],
                              )
                            }
                            className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 whitespace-nowrap"
                          >
                            Delete Vehicle
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(driver)}
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(driver)}
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
        <DriverModal
          key={driverToEdit?.id || "new"}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setDriverToEdit(null);
          }}
          driverToEdit={driverToEdit}
          onSuccess={() => setDriverToEdit(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Driver"
        message={
          vehicleMap[deleteConfirm?.vehicleId]
            ? `${deleteConfirm?.fullName} is currently assigned ${vehicleMap[deleteConfirm.vehicleId].ownerType === "driver" ? "their own vehicle" : "a company vehicle"} (${vehicleMap[deleteConfirm.vehicleId].plateNumber}). ${vehicleMap[deleteConfirm.vehicleId].ownerType === "driver" ? "That vehicle will also be deleted." : "It will become unassigned."} Continue?`
            : `Delete ${deleteConfirm?.fullName}?`
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        isOpen={!!vehicleDeleteConfirm}
        title="Delete Vehicle"
        message={`Delete ${vehicleDeleteConfirm?.make} ${vehicleDeleteConfirm?.model} (${vehicleDeleteConfirm?.plateNumber})? This driver's record will stay, but they'll be unassigned from this vehicle.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        loading={deletingVehicle}
        onConfirm={handleConfirmDeleteVehicle}
        onCancel={() => setVehicleDeleteConfirm(null)}
      />
    </div>
  );
}
