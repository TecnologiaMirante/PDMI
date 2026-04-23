import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./config";

/**
 * Faz login com Google e bloqueia contas fora de @mirante.com.br.
 * Retorna o userCredential ou lança um erro com código customizado.
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);

  if (!result.user.email?.endsWith("@mirante.com.br")) {
    await result.user.delete(); // remove do Authentication — não fica no banco
    const err = new Error("Acesso restrito a contas @mirante.com.br.");
    err.code = "auth/unauthorized-domain-mirante";
    throw err;
  }

  return result;
}

export async function logout() {
  await signOut(auth);
}
