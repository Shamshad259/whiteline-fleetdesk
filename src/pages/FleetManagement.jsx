import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useVehicleClasses } from "../hooks/useVehicleClasses";
import { useVehicleModels } from "../hooks/useVehicleModels";
import { deleteVehicleClass } from "../utils/vehicleClassService";
import { deleteVehicleModel } from "../utils/vehicleModelService";
import { VehicleClassModal } from "../components/VehicleClassModal";
import { VehicleModelModal } from "../components/VehicleModelModal";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function FleetManagement() {
  const { vehicleClasses, loading: classesLoading } = useVehicleClasses();
  const { vehicleModels, loading: modelsLoading } = useVehicleModels();

  const [selectedClassId, setSelectedClassId] = useState(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState(null);
  const [classDeleteConfirm, setClassDeleteConfirm] = useState(null);
  const [deletingClass, setDeletingClass] = useState(false);

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [modelToEdit, setModelToEdit] = useState(null);
  const [modelDeleteConfirm, setModelDeleteConfirm] = useState(null);
  const [deletingModel, setDeletingModel] = useState(false);

  const filteredModels = useMemo(() => {
    if (!selectedClassId) return vehicleModels;
    return vehicleModels.filter((m) => m.classId === selectedClassId);
  }, [vehicleModels, selectedClassId]);

  const modelCountByClass = useMemo(() => {
    const map = {};
    vehicleModels.forEach((m) => {
      map[m.classId] = (map[m.classId] || 0) + 1;
    });
    return map;
  }, [vehicleModels]);

  const handleAddClass = () => {
    setClassToEdit(null);
    setIsClassModalOpen(true);
  };

  const handleEditClass = (cls) => {
    setClassToEdit(cls);
    setIsClassModalOpen(true);
  };

  const handleConfirmDeleteClass = async () => {
    setDeletingClass(true);
    try {
      await deleteVehicleClass(classDeleteConfirm.id);
      toast.success("Vehicle class deleted");
      if (selectedClassId === classDeleteConfirm.id) setSelectedClassId(null);
      setClassDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || "Error deleting vehicle class");
    } finally {
      setDeletingClass(false);
    }
  };

  const handleAddModel = () => {
    setModelToEdit(null);
    setIsModelModalOpen(true);
  };

  const handleEditModel = (model) => {
    setModelToEdit(model);
    setIsModelModalOpen(true);
  };

  const handleConfirmDeleteModel = async () => {
    setDeletingModel(true);
    try {
      await deleteVehicleModel(modelDeleteConfirm.id);
      toast.success("Vehicle model deleted");
      setModelDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || "Error deleting vehicle model");
    } finally {
      setDeletingModel(false);
    }
  };

  const classNameById = (id) => vehicleClasses.find((c) => c.id === id)?.name;

  if (classesLoading || modelsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading fleet data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Fleet Management
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vehicle Classes column */}
        <div className="md:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Vehicle Classes
            </h2>
            <button
              onClick={handleAddClass}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setSelectedClassId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg border ${
                selectedClassId === null
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              All Classes ({vehicleModels.length})
            </button>

            {vehicleClasses.map((cls) => (
              <div
                key={cls.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                  selectedClassId === cls.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <button
                  onClick={() => setSelectedClassId(cls.id)}
                  className="flex-1 text-left"
                >
                  {cls.name}{" "}
                  <span className="text-gray-400 text-sm">
                    ({modelCountByClass[cls.id] || 0})
                  </span>
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditClass(cls)}
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setClassDeleteConfirm(cls)}
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {vehicleClasses.length === 0 && (
              <p className="text-sm text-gray-500 py-2">
                No vehicle classes yet. Add one to get started.
              </p>
            )}
          </div>
        </div>

        {/* Vehicle Models column */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedClassId
                ? `Models — ${classNameById(selectedClassId)}`
                : "All Models"}
            </h2>
            <button
              onClick={handleAddModel}
              disabled={vehicleClasses.length === 0}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              + Add Model
            </button>
          </div>

          {filteredModels.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No models yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {model.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {classNameById(model.classId)} ·{" "}
                        {model.rateShape === "coach"
                          ? "Coach pricing"
                          : "Standard pricing"}
                        {model.passengers ? ` · ${model.passengers} pax` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditModel(model)}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setModelDeleteConfirm(model)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {model.rateShape === "coach" ? (
                    <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      {model.hourTiers?.map((t, i) => (
                        <span key={i}>
                          {t.hours}hr: SAR {t.amount}
                        </span>
                      ))}
                      <span>Transfer: SAR {model.transfer?.amount}</span>
                      <span>Extra hr: SAR {model.extraHourlyCharge}</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      {model.fullDayTiers?.map((t, i) => (
                        <span key={i}>
                          Full Day {t.hours}h: SAR {t.amount}
                        </span>
                      ))}
                      <span>
                        Half Day {model.halfDay?.hours}h: SAR{" "}
                        {model.halfDay?.amount}
                      </span>
                      <span>Hourly: SAR {model.hourly?.amount}/hr</span>
                      <span>City: SAR {model.cityTransfer?.amount}</span>
                      <span>Airport: SAR {model.airportTransfer?.amount}</span>
                      <span>Extra/km: SAR {model.extraPerKm}</span>
                      <span>Extra hr: SAR {model.extraHourlyCharge}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isClassModalOpen && (
        <VehicleClassModal
          key={classToEdit?.id || "new-class"}
          isOpen={isClassModalOpen}
          onClose={() => {
            setIsClassModalOpen(false);
            setClassToEdit(null);
          }}
          classToEdit={classToEdit}
          onSuccess={() => setClassToEdit(null)}
        />
      )}

      {isModelModalOpen && (
        <VehicleModelModal
          key={modelToEdit?.id || "new-model"}
          isOpen={isModelModalOpen}
          onClose={() => {
            setIsModelModalOpen(false);
            setModelToEdit(null);
          }}
          modelToEdit={modelToEdit}
          vehicleClasses={vehicleClasses}
          defaultClassId={selectedClassId}
          onSuccess={() => setModelToEdit(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!classDeleteConfirm}
        title="Delete Vehicle Class"
        message={`Delete "${classDeleteConfirm?.name}"? This will fail if any models still use this class.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        loading={deletingClass}
        onConfirm={handleConfirmDeleteClass}
        onCancel={() => setClassDeleteConfirm(null)}
      />

      <ConfirmDialog
        isOpen={!!modelDeleteConfirm}
        title="Delete Vehicle Model"
        message={`Delete "${modelDeleteConfirm?.name}"? This will fail if any vehicles are still assigned to it.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        loading={deletingModel}
        onConfirm={handleConfirmDeleteModel}
        onCancel={() => setModelDeleteConfirm(null)}
      />
    </div>
  );
}
