import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

export async function getChatHistory(userId, dashboardId) {
  if (!userId || !dashboardId) return [];
  try {
    const ref = doc(db, "chat_history", userId, "dashboards", dashboardId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().messages || [];
    }
  } catch (error) {
    console.error("Erro ao buscar histórico do chat:", error);
  }
  return [];
}

export async function saveChatHistory(userId, dashboardId, messages) {
  if (!userId || !dashboardId || !messages) return;
  try {
    const ref = doc(db, "chat_history", userId, "dashboards", dashboardId);
    await setDoc(ref, {
      messages,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao salvar histórico do chat:", error);
  }
}

export async function clearChatHistory(userId, dashboardId) {
  if (!userId || !dashboardId) return;
  try {
    const ref = doc(db, "chat_history", userId, "dashboards", dashboardId);
    await deleteDoc(ref);
  } catch (error) {
    console.error("Erro ao limpar histórico do chat:", error);
  }
}
