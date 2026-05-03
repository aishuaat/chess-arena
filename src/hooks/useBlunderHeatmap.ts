"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  aggregateBySquare,
  computeHeatmapStyles,
  computeSessionHeatmapStyles,
  computeDiffStyles,
} from "@/lib/analytics";
import type { UserStats } from "@/lib/analytics";

type HeatmapStyles = Record<string, CSSProperties>;

export function useBlunderHeatmap(
  userStats: UserStats | null,
  sessionBlunders: Array<{ square: string }>,
) {
  const allTimeStyles = useMemo<HeatmapStyles>(
    () => (userStats ? computeHeatmapStyles(userStats.blundersBySquare) : {}),
    [userStats],
  );

  const sessionBySquare = useMemo(
    () => aggregateBySquare(sessionBlunders),
    [sessionBlunders],
  );

  const sessionStyles = useMemo<HeatmapStyles>(
    () => computeSessionHeatmapStyles(sessionBlunders),
    [sessionBlunders],
  );

  const diffStyles = useMemo<HeatmapStyles>(
    () =>
      userStats
        ? computeDiffStyles(sessionBySquare, userStats.blundersBySquare)
        : {},
    [sessionBySquare, userStats],
  );

  return { allTimeStyles, sessionStyles, diffStyles, sessionBySquare };
}
