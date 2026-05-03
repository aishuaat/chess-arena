"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  auth,
  isFirebaseConfigured,
  loginWithEmail,
  loginWithGoogle,
  logout,
  signUpWithEmail,
} from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    isAuthLoading,
    isFirebaseConfigured,
    loginWithEmail,
    loginWithGoogle,
    logout,
    signUpWithEmail,
    user,
  };
}
