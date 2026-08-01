import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useVehicles } from "../hooks/useVehicles";
import { deleteVehicle } from "../utils/vehicleService";
import { useVehicleClasses } from "../hooks/useVehicleClasses";
import { useVehicleModels } from "../hooks/useVehicleModels";
import { VehicleModal } from "../components/VehicleModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useDrivers } from "../hooks/useDrivers";
import { useNavigate } from "react-router-dom";

export function Vehicles() {
  const { vehicles, loading } = useVehicles();
  const { vehicleClasses } = useVehicleClasses();
  const { vehicleModels } = useVehicleModels();
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { drivers } = useDrivers();
  const navigate = useNavigate();

  const driverByVehicleId = useMemo(() => {
    const map = {};
    drivers.forEach((d) => {
      if (d.vehicleId) map[d.vehicleId] = d;
    });
    return map;
  }, [drivers]);

  const modelById = useMemo(() => {
    const map = {};
    vehicleModels.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [vehicleModels]);

  const classNameById = (id) =>
    vehicleClasses.find((c) => c.id === id)?.name || "";

  const modelsForFilter = useMemo(() => {
    if (classFilter === "all") return vehicleModels;
    return vehicleModels.filter((m) => m.classId === classFilter);
  }, [vehicleModels, classFilter]);

  const handleClassFilterChange = (e) => {
    setClassFilter(e.target.value);
    setModelFilter("all");
  };

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        if (classFilter === "all") return true;
        const model = modelById[v.modelId];
        return model?.classId === classFilter;
      })
      .filter((v) => {
        if (modelFilter === "all") return true;
        return v.modelId === modelFilter;
      })
      .filter((v) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const model = modelById[v.modelId];
        return (
          model?.name?.toLowerCase().includes(q) ||
          v.plateNumber?.toLowerCase().includes(q)
        );
      });
  }, [vehicles, modelById, classFilter, modelFilter, searchQuery]);

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

  const renderModelInfo = (vehicle) => {
    const model = modelById[vehicle.modelId];
    if (!model) {
      return (
        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
          Unassigned model
        </span>
      );
    }
    return (
      <div>
        <p className="font-bold text-gray-900">{model.name}</p>
        <p className="text-xs text-gray-500">{classNameById(model.classId)}</p>
      </div>
    );
  };

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
            placeholder="Search by model or plate..."
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
                  {renderModelInfo(vehicle)}
                  <p className="text-sm text-gray-600">{vehicle.plateNumber}</p>
                </div>
                <div className="flex justify-between items-center mt-3 text-sm">
                  <OwnerBadge ownerType={vehicle.ownerType} />
                  <p className="text-sm text-gray-600">
                    {[vehicle.year, vehicle.color].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  {vehicle.ownerType === "driver" ? (
                    <button
                      onClick={() =>
                        navigate("/drivers", {
                          state: {
                            highlightDriverId:
                              driverByVehicleId[vehicle.id]?.id,
                          },
                        })
                      }
                      className="w-full mt-4 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      Managed via Driver
                      {driverByVehicleId[vehicle.id]
                        ? `: ${driverByVehicleId[vehicle.id].fullName}`
                        : ""}
                    </button>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleEditClick(vehicle)}
                        className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(vehicle)}
                        className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  )}
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
                    Model / Class
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Plate Number
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Year
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Colour
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Owner
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
                      {renderModelInfo(vehicle)}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {vehicle.plateNumber}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {vehicle.year || "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {vehicle.color || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <OwnerBadge ownerType={vehicle.ownerType} />
                    </td>
                    <td className="py-3 px-4">
                      {vehicle.ownerType === "driver" ? (
                        <button
                          onClick={() =>
                            navigate("/drivers", {
                              state: {
                                highlightDriverId:
                                  driverByVehicleId[vehicle.id]?.id,
                              },
                            })
                          }
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          Managed via Driver
                          {driverByVehicleId[vehicle.id]
                            ? `: ${driverByVehicleId[vehicle.id].fullName}`
                            : ""}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(vehicle)}
                            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(vehicle)}
                            className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      )}
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
        message={
          driverByVehicleId[deleteConfirm?.id]
            ? `${modelById[deleteConfirm?.modelId]?.name || "This vehicle"} (${deleteConfirm?.plateNumber}) is currently assigned to ${driverByVehicleId[deleteConfirm?.id].fullName}. Deleting it will unassign them. Continue?`
            : `Delete ${modelById[deleteConfirm?.modelId]?.name || "this vehicle"} (${deleteConfirm?.plateNumber})?`
        }
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
