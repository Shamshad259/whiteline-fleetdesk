import { useMemo, useState } from "react";
import {
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDrivers } from "../hooks/useDrivers";
import { useTrips } from "../hooks/useTrips";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `SAR ${amount.toLocaleString("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getRangeForPreset(preset, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (preset) {
    case "Last Month": {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
    case "This Year": {
      const start = new Date(year, 0, 1);
      return { start: formatDateInput(start), end: formatDateInput(today) };
    }
    case "Last Year": {
      const start = new Date(year - 1, 0, 1);
      const end = new Date(year - 1, 11, 31);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
    case "All Time":
      return { start: "", end: "" };
    case "Custom":
      return { start: "", end: "" };
    case "This Month":
    default: {
      const start = getStartOfMonth(today);
      const end = getEndOfMonth(today);
      return { start: formatDateInput(start), end: formatDateInput(end) };
    }
  }
}

export function Dashboard() {
  const { trips, loading: tripsLoading } = useTrips();
  const { drivers, loading: driversLoading } = useDrivers();
  const [preset, setPreset] = useState("This Month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("all");

  const effectiveRange = useMemo(() => {
    if (preset === "Custom") {
      return { start: startDate, end: endDate };
    }

    const computed = getRangeForPreset(preset);
    return {
      start: computed.start,
      end: computed.end,
    };
  }, [preset, startDate, endDate]);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchesDriver =
        selectedDriverId === "all" || trip.driverId === selectedDriverId;
      const matchesStartDate =
        !effectiveRange.start || trip.tripDate >= effectiveRange.start;
      const matchesEndDate =
        !effectiveRange.end || trip.tripDate <= effectiveRange.end;
      return matchesDriver && matchesStartDate && matchesEndDate;
    });
  }, [trips, selectedDriverId, effectiveRange]);

  const summary = useMemo(() => {
    const totalRevenue = filteredTrips.reduce(
      (sum, trip) => sum + Number(trip.amount || 0),
      0,
    );
    const totalExpenses = filteredTrips.reduce(
      (sum, trip) => sum + Number(trip.expense || 0),
      0,
    );
    const totalProfit = filteredTrips.reduce(
      (sum, trip) => sum + Number(trip.profit || 0),
      0,
    );
    const outstanding = filteredTrips.reduce((sum, trip) => {
      if (trip.paymentStatus === "Paid") return sum;
      const balance = Number(trip.amount || 0) - Number(trip.amountPaid || 0);
      return sum + Math.max(0, balance);
    }, 0);

    return {
      totalRevenue,
      totalExpenses,
      totalProfit,
      outstanding,
    };
  }, [filteredTrips]);

  const chartData = useMemo(() => {
    if (filteredTrips.length === 0) return [];

    const start = effectiveRange.start;
    const end = effectiveRange.end;
    const withinSingleMonth =
      start && end && start.slice(0, 7) === end.slice(0, 7);

    const buckets = new Map();

    filteredTrips.forEach((trip) => {
      const date = trip.tripDate;
      const bucketKey = withinSingleMonth ? date : date.slice(0, 7);

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { label: bucketKey, revenue: 0, profit: 0 });
      }

      const entry = buckets.get(bucketKey);
      entry.revenue += Number(trip.amount || 0);
      entry.profit += Number(trip.profit || 0);
    });

    return Array.from(buckets.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [filteredTrips, effectiveRange]);

  const paymentBreakdown = useMemo(() => {
    const statuses = ["Paid", "Partial", "Unpaid"];
    return statuses.map((status) => {
      const matchingTrips = filteredTrips.filter(
        (trip) => trip.paymentStatus === status,
      );
      return {
        status,
        amount: matchingTrips.reduce(
          (sum, trip) => sum + Number(trip.amount || 0),
          0,
        ),
        count: matchingTrips.length,
      };
    });
  }, [filteredTrips]);

  const topCustomers = useMemo(() => {
    const grouped = new Map();

    filteredTrips.forEach((trip) => {
      if (!trip.customerName) return;
      if (!grouped.has(trip.customerName)) {
        grouped.set(trip.customerName, {
          name: trip.customerName,
          revenue: 0,
          count: 0,
        });
      }
      const entry = grouped.get(trip.customerName);
      entry.revenue += Number(trip.amount || 0);
      entry.count += 1;
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredTrips]);

  const handlePresetChange = (nextPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== "Custom") {
      const computed = getRangeForPreset(nextPreset);
      setStartDate(computed.start);
      setEndDate(computed.end);
    }
  };

  const loading = tripsLoading || driversLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="This Year">This Year</option>
                <option value="Last Year">Last Year</option>
                <option value="All Time">All Time</option>
                <option value="Custom">Custom</option>
              </select>

              {preset === "Custom" ? (
                <>
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
                </>
              ) : null}

              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Drivers</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-600">No data for this period</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Total Expenses
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Profit</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(summary.totalProfit)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Outstanding</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(summary.outstanding)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr] mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Revenue vs Profit
                </h2>
                <p className="text-sm text-gray-500">
                  Grouped by month or day based on the selected range
                </p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Payment Status
                </h2>
                <p className="text-sm text-gray-500">
                  Amount and count by status
                </p>
              </div>
              <div className="space-y-3">
                {paymentBreakdown.map((item) => (
                  <div
                    key={item.status}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{item.status}</p>
                      <p className="text-sm text-gray-600">
                        {item.count} trips
                      </p>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Top Customers by Revenue
              </h2>
              <p className="text-sm text-gray-500">
                Top 5 customers in the selected period
              </p>
            </div>
            <div className="space-y-3">
              {topCustomers.map((customer) => (
                <div
                  key={customer.name}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-500">
                      {customer.count} trips
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(customer.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
