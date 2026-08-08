import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDrivers } from "../hooks/useDrivers";
import { useTimesheets } from "../hooks/useTimesheets";
import { deleteTimesheet } from "../utils/timesheetService";
import { TimesheetModal } from "../components/TimesheetModal";
import { generateTimesheetPdf } from "../utils/timesheetPdf";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ModalShell } from "../components/ModalShell";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `SAR ${amount.toLocaleString("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

export function Timesheets() {
  const { timesheets, loading } = useTimesheets();
  const { drivers, loading: driversLoading } = useDrivers();
  const [driverFilter, setDriverFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [activeDriver, setActiveDriver] = useState(null);
  const [driverSelectionOpen, setDriverSelectionOpen] = useState(false);
  const [selectedDriverIdForNewEntry, setSelectedDriverIdForNewEntry] =
    useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const driverById = useMemo(() => {
    const map = {};
    drivers.forEach((driver) => {
      map[driver.id] = driver;
    });
    return map;
  }, [drivers]);

  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((entry) => {
      const matchesDriver =
        driverFilter === "all" || entry.driverId === driverFilter;
      const matchesStartDate = !startDate || entry.shiftDate >= startDate;
      const matchesEndDate = !endDate || entry.shiftDate <= endDate;
      return matchesDriver && matchesStartDate && matchesEndDate;
    });
  }, [timesheets, driverFilter, startDate, endDate]);

  const sortedTimesheets = useMemo(() => {
    return [...filteredTimesheets].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.().getTime?.() || 0;
      const timeB = b.createdAt?.toDate?.().getTime?.() || 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      const sortA = a.shiftDate || "";
      const sortB = b.shiftDate || "";
      return sortB.localeCompare(sortA);
    });
  }, [filteredTimesheets]);

  const handleAddClick = () => {
    if (!drivers.length) {
      toast.error("No drivers are available yet");
      return;
    }

    if (drivers.length === 1) {
      openModalForDriver(drivers[0]);
      return;
    }

    setSelectedDriverIdForNewEntry(drivers[0]?.id || "");
    setDriverSelectionOpen(true);
  };

  const openModalForDriver = (driver) => {
    setEntryToEdit(null);
    setActiveDriver(driver || null);
    setDriverSelectionOpen(false);
    setIsModalOpen(true);
  };

  const handleEditClick = (entry) => {
    setEntryToEdit(entry);
    setActiveDriver(driverById[entry.driverId] || null);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    setEntryToEdit(null);
    setActiveDriver(null);
    setIsModalOpen(false);
  };

  const handleExportPdf = async () => {
    if (sortedTimesheets.length === 0) {
      toast.error("No entries to export for the current filters");
      return;
    }
    const entriesWithDriverName = sortedTimesheets.map((entry) => ({
      ...entry,
      driverName: driverById[entry.driverId]?.fullName || "Unknown Driver",
    }));
    const driverLabel =
      driverFilter === "all"
        ? "All Drivers"
        : driverById[driverFilter]?.fullName || "Selected Driver";
    await generateTimesheetPdf({
      entries: entriesWithDriverName,
      filterLabel: driverLabel,
    });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteTimesheet(deleteConfirm.id);
      toast.success("Timesheet entry deleted");
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || "Error deleting timesheet entry");
    } finally {
      setDeleting(false);
    }
  };

  const renderRoute = (entry) => {
    const pickup = entry.pickupLocation || "—";
    const destination = entry.destination || "—";
    return `${pickup} → ${destination}`;
  };

  if (loading || driversLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading timesheets...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Timesheets</h1>
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
            onClick={handleExportPdf}
            className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 whitespace-nowrap"
          >
            Export PDF
          </button>
          <button
            onClick={handleAddClick}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            + Add Entry
          </button>
        </div>
      </div>

      {sortedTimesheets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No timesheet entries found</p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-4">
            {sortedTimesheets.map((entry) => {
              const driver = driverById[entry.driverId];
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {driver?.fullName || "Unknown driver"}
                      </p>
                      <p className="text-sm text-gray-600">{entry.shiftDate}</p>
                    </div>
                    {entry.addedByAdmin ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Admin Added
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Service:</span>{" "}
                      {entry.serviceRef || "—"}
                    </p>
                    {entry.customerCode ? (
                      <p>
                        <span className="font-medium">Customer Code:</span>{" "}
                        {entry.customerCode}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-medium">Route:</span>{" "}
                      {renderRoute(entry)}
                    </p>
                    <p>
                      <span className="font-medium">Total KM:</span>{" "}
                      {formatNumber(entry.totalKm)}
                    </p>
                    <p>
                      <span className="font-medium">Expenses:</span>{" "}
                      {formatCurrency(entry.totalExpenses)}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEditClick(entry)}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(entry)}
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
                    Driver
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Shift Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Service Ref
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Customer Code
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Route
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Total KM
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Expenses
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTimesheets.map((entry) => {
                  const driver = driverById[entry.driverId];
                  return (
                    <tr key={entry.id} className="border-b border-gray-200">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{driver?.fullName || "Unknown driver"}</span>
                          {entry.addedByAdmin ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Admin
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {entry.shiftDate}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {entry.serviceRef || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {formatNumber(entry.customerCode || "")}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {renderRoute(entry)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {formatNumber(entry.totalKm)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {formatCurrency(entry.totalExpenses)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(entry)}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(entry)}
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

      <TimesheetModal
        key={entryToEdit?.id || `new-${activeDriver?.id || "none"}`}
        isOpen={isModalOpen}
        onClose={() => {
          setEntryToEdit(null);
          setActiveDriver(null);
          setIsModalOpen(false);
        }}
        entryToEdit={entryToEdit}
        driverId={activeDriver?.id || entryToEdit?.driverId || ""}
        driverName={
          activeDriver?.fullName ||
          driverById[entryToEdit?.driverId]?.fullName ||
          ""
        }
        onSuccess={handleModalSuccess}
      />

      {driverSelectionOpen ? (
        <ModalShell
          title="Select Driver"
          onClose={() => setDriverSelectionOpen(false)}
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose the driver for the new timesheet entry.
            </p>
            <select
              value={selectedDriverIdForNewEntry}
              onChange={(e) => setSelectedDriverIdForNewEntry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDriverSelectionOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosenDriver = drivers.find(
                    (driver) => driver.id === selectedDriverIdForNewEntry,
                  );
                  if (!chosenDriver) {
                    toast.error("Please pick a driver first");
                    return;
                  }
                  openModalForDriver(chosenDriver);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title="Delete timesheet entry"
        message="This action cannot be undone."
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
