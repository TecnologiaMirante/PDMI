import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Busca todos os setores ordenados alfabeticamente por nome.
 */
export async function getSectors() {
  const q = query(collection(db, "sectors"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  const sectors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return sectors;
}

/**
 * Cria um novo setor.
 */
export async function createSector(data, uid) {
  const sectorRef = doc(collection(db, "sectors"));
  await setDoc(sectorRef, {
    ...data,
    created_at: serverTimestamp(),
    created_by: uid,
    updated_at: serverTimestamp(),
    updated_by: uid,
  });
  return sectorRef.id;
}

/**
 * Atualiza um setor existente.
 */
export async function updateSector(sectorId, data, uid) {
  const ref = doc(db, "sectors", sectorId);
  await updateDoc(ref, {
    ...data,
    updated_at: serverTimestamp(),
    updated_by: uid,
  });
}

/**
 * Deleta um setor.
 */
export async function deleteSector(sectorId) {
  const ref = doc(db, "sectors", sectorId);
  await deleteDoc(ref);
}
