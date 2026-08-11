import { useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { useDrivers } from "../hooks/useDrivers";
import { useVehicles } from "../hooks/useVehicles";
import { useVehicleClasses } from "../hooks/useVehicleClasses";
import { useVehicleModels } from "../hooks/useVehicleModels";
import { deleteDriver } from "../utils/driverService";
import { deleteVehicle } from "../utils/vehicleService";
import { DriverModal } from "../components/DriverModal";
import { TimesheetLinkModal } from "../components/TimesheetLinkModal";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function Drivers() {
  const { drivers, loading } = useDrivers();
  const { vehicles } = useVehicles();
  const { vehicleClasses } = useVehicleClasses();
  const { vehicleModels } = useVehicleModels();
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [driverTypeFilter, setDriverTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [vehicleDeleteConfirm, setVehicleDeleteConfirm] = useState(null);
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [timesheetDriverId, setTimesheetDriverId] = useState(null);
  const timesheetDriver =
    drivers.find((d) => d.id === timesheetDriverId) || null;

  const vehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {
      map[v.id] = v;
    });
    return map;
  }, [vehicles]);

  const modelById = useMemo(() => {
    const map = {};
    vehicleModels.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [vehicleModels]);

  // eslint-disable-next-line react-hooks/exhaustive-deps, no-undef
  const classNameById = useCallback(
    (id) => vehicleClasses.find((c) => c.id === id)?.name || "",
  );

  const modelsForFilter = useMemo(() => {
    if (classFilter === "all") return vehicleModels;
    return vehicleModels.filter((m) => m.classId === classFilter);
  }, [vehicleModels, classFilter]);

  const handleClassFilterChange = (e) => {
    setClassFilter(e.target.value);
    setModelFilter("all");
  };

  const filteredDrivers = useMemo(() => {
    return drivers
      .filter((d) => {
        if (classFilter === "all") return true;
        const vehicle = vehicleMap[d.vehicleId];
        const model = modelById[vehicle?.modelId];
        return model?.classId === classFilter;
      })
      .filter((d) => {
        if (modelFilter === "all") return true;
        const vehicle = vehicleMap[d.vehicleId];
        return vehicle?.modelId === modelFilter;
      })
      .filter((d) =>
        driverTypeFilter === "all" ? true : d.driverType === driverTypeFilter,
      )
      .filter((d) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const vehicle = vehicleMap[d.vehicleId];
        const model = modelById[vehicle?.modelId];
        const className = classNameById(model?.classId);
        return (
          d.fullName?.toLowerCase().includes(q) ||
          d.phone?.toLowerCase().includes(q) ||
          model?.name?.toLowerCase().includes(q) ||
          className?.toLowerCase().includes(q)
        );
      });
  }, [
    drivers,
    classFilter,
    vehicleMap,
    modelById,
    modelFilter,
    driverTypeFilter,
    searchQuery,
    classNameById,
  ]);

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
    const model = modelById[vehicle.modelId];
    return (
      <div>
        <p className="font-medium text-gray-900 text-sm">
          {model?.name || "Unknown model"}
        </p>
        <p className="text-xs text-gray-500">
          {vehicle.plateNumber} · {classNameById(model?.classId)}
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
        <div className="flex flex-col md:flex-row gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={classFilter}
            onChange={handleClassFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Classes</option>
            {vehicleClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Models</option>
            {modelsForFilter.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
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
                    onClick={() => setTimesheetDriverId(driver.id)}
                    className="flex-1 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
                  >
                    Timesheet Link
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
                          onClick={() => setTimesheetDriverId(driver.id)}
                          className="px-3 py-1 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
                        >
                          Timesheet Link
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

      {timesheetDriver && (
        <TimesheetLinkModal
          isOpen={!!timesheetDriver}
          onClose={() => setTimesheetDriverId(null)}
          driver={timesheetDriver}
          onSuccess={() => {}}
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
        message={`Delete this vehicle (${vehicleDeleteConfirm?.plateNumber})? This driver's record will stay, but they'll be unassigned from this vehicle.`}
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
