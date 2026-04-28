import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@infra/firebase";
import { getUserProfile, createUser } from "@infra/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Segurança: força logout se o e-mail não for @mirante.com.br
        if (!firebaseUser.email?.endsWith("@mirante.com.br")) {
          await signOut(auth);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        const baseUser = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          picture: firebaseUser.photoURL,
          given_name: firebaseUser.displayName?.split(" ")[0] || "",
          family_name:
            firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
        };
        setUser(baseUser);

        try {
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            await createUser(firebaseUser.uid, {
              uid: firebaseUser.uid,
              display_name: firebaseUser.displayName || "",
              email: firebaseUser.email || "",
              photo_url: firebaseUser.photoURL || "",
              typeUser: "user",
              created_time: new Date(),
            });
            profile = await getUserProfile(firebaseUser.uid);
          }
          setUserProfile(profile);
        } catch (e) {
          console.error("Erro ao buscar/criar perfil:", e);
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const profile = await getUserProfile(uid);
      setUserProfile(profile);
    } catch (e) {
      console.error("Erro ao atualizar perfil:", e);
    }
  };

  const isAdmin =
    userProfile?.typeUser === "admin" || userProfile?.typeUser === "superadmin";
  const isSuperAdmin = userProfile?.typeUser === "superadmin";

  return (
    <AuthContext.Provider
      value={{ user, userProfile, isAdmin, isSuperAdmin, logout, loading, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
