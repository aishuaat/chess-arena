"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

export type GameRecord = {
  id: string;
  result: "win" | "loss" | "draw";
  movesCount: number;
  blundersCount: number;
  createdAt: { toMillis: () => number } | null;
};

export function useGameHistory(user: User | null, pageSize = 20) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || !db) {
      setGames([]);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, "users", user.uid, "games"),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGames(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<GameRecord, "id">),
          })),
        );
        setIsLoading(false);
      },
      () => {
        setGames([]);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [user, pageSize]);

  return { games, isLoading };
}
