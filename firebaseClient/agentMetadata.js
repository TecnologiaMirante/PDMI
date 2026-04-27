import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

export async function getAgentMetadata(dashboardId) {
  const ref = doc(db, "dashboard_metadata", dashboardId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}

export async function setAgentMetadata(dashboardId, data) {
  const ref = doc(db, "dashboard_metadata", dashboardId);
  await setDoc(ref, {
    ...data,
    last_synced_at: serverTimestamp(),
  });
}
