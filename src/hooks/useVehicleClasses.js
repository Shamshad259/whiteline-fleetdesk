import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export function useVehicleClasses() {
  const [vehicleClasses, setVehicleClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "vehicleClasses"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVehicleClasses(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { vehicleClasses, loading };
}
