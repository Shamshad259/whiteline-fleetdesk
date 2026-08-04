import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { getCustomerProfile } from "../utils/customerService";

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "customers"), orderBy("fullName", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { customers, loading };
}

// --- Added for the Customers list page ---
// Live customer list (same listener as above) + a one-time trip rollup per customer.
// One-time fetch is intentional here: trip stats don't need live updates on this
// page the way the customer list itself does, and it avoids a second onSnapshot
// listener joining against the whole trips collection.
export function useCustomersWithStats() {
  const { customers, loading: loadingCustomers } = useCustomers();
  const [stats, setStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (loadingCustomers) return;
    let cancelled = false;

    Promise.all(
      customers.map((c) =>
        getCustomerProfile(c.id)
          .then(({ trips }) => [c.id, trips])
          .catch(() => [c.id, []]),
      ),
    ).then((entries) => {
      if (cancelled) return;
      const map = {};
      entries.forEach(([id, trips]) => {
        const totalRevenue = trips.reduce(
          (s, t) => s + (Number(t.amount) || 0),
          0,
        );
        const outstanding = trips
          .filter(
            (t) =>
              t.paymentStatus === "Partial" || t.paymentStatus === "Unpaid",
          )
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        map[id] = { tripCount: trips.length, totalRevenue, outstanding };
      });
      setStats(map);
      setLoadingStats(false);
    });

    return () => {
      cancelled = true;
    };
  }, [customers, loadingCustomers]);

  const customersWithStats = customers.map((c) => ({
    ...c,
    tripCount: stats[c.id]?.tripCount ?? 0,
    totalRevenue: stats[c.id]?.totalRevenue ?? 0,
    outstanding: stats[c.id]?.outstanding ?? 0,
  }));

  return {
    customers: customersWithStats,
    loading: loadingCustomers || loadingStats,
  };
}

export function useCustomerProfile(customerId) {
  const [customer, setCustomer] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) return;
      setLoading(true);
      setError(null);
    });
    getCustomerProfile(customerId)
      .then(({ customer, trips }) => {
        if (cancelled) return;
        setCustomer(customer);
        setTrips(trips);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load customer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return { customer, trips, loading, error };
}
