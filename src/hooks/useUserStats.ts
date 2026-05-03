"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { UserStats } from "@/lib/analytics";

export function useUserStats(user: User | null) {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || !db) {
      setUserStats(null);
      return;
    }

    setIsLoading(true);
    const statsRef = doc(db, "userStats", user.uid);

    const unsubscribe = onSnapshot(
      statsRef,
      (snap) => {
        setUserStats(snap.exists() ? (snap.data() as UserStats) : null);
        setIsLoading(false);
      },
      () => {
        setUserStats(null);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  return { userStats, isLoading };
}
