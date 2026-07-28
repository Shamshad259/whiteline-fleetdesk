import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export function useVehicleModels() {
  const [vehicleModels, setVehicleModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "vehicleModels"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVehicleModels(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { vehicleModels, loading };
}
