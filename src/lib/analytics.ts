import type { CSSProperties } from "react";

export type UserStats = {
  userId: string;
  totalGames: number;
  totalBlunders: number;
  blundersBySquare: Record<string, number>;
  lastGameBlunders: number;
  previousAvgBlunders: number;
  improvementPercent: number;
  cleanGameStreak: number;
  lastCompletedDate?: string;
  streakDays?: number;
};

export type SessionBlunder = {
  square: string;
  pieceLost: string;
  severity: number;
};

// ── Level system ──────────────────────────────────────────────────────────────

const GAMES_PER_LEVEL = 3;
const MAX_LEVEL = 7;

const LEVEL_TITLES: Record<number, string> = {
  1: "Beginner",
  2: "Learner",
  3: "Blunder Survivor",
  4: "Tactical Explorer",
  5: "Strategic Mind",
  6: "Chess Thinker",
  7: "Arena Master",
};

export type LevelResult = {
  level: number;
  title: string;
  gamesInLevel: number;
  gamesPerLevel: number;
  isMaxLevel: boolean;
};

export function computeLevel(totalGames: number): LevelResult {
  const raw = Math.floor(totalGames / GAMES_PER_LEVEL) + 1;
  const level = Math.min(raw, MAX_LEVEL);
  const isMaxLevel = level >= MAX_LEVEL;
  const gamesInLevel = isMaxLevel ? GAMES_PER_LEVEL : totalGames % GAMES_PER_LEVEL;
  return {
    level,
    title: LEVEL_TITLES[level] ?? "Arena Master",
    gamesInLevel,
    gamesPerLevel: GAMES_PER_LEVEL,
    isMaxLevel,
  };
}

// ── Play Style DNA ────────────────────────────────────────────────────────────

export type PlayStyleResult = {
  style: string;
  description: string;
  icon: string;
  color: string;
};

export function computePlayStyle(stats: UserStats): PlayStyleResult {
  const { totalGames, totalBlunders, improvementPercent } = stats;

  // Not enough data yet
  if (totalGames < 3) {
    return {
      style: "Balanced Strategist",
      description: "Keep playing to unlock your true style. Every game reveals more about how you think.",
      icon: "⚖️",
      color: "text-violet-400",
    };
  }

  const blundersPerGame = totalBlunders / totalGames;
  const isImproving = improvementPercent > 0;

  // aggressionRate  ≈ blundersPerGame (risky/aggressive play produces more blunders)
  // avgEvalLoss     ≈ blundersPerGame (each blunder is a large eval loss)
  // activity        = totalGames

  if (blundersPerGame > 5) {
    return {
      style: "Blunder Magnet",
      description: "Every game is a learning opportunity. Slow down, calculate two moves ahead, and the blunders will disappear.",
      icon: "💥",
      color: "text-rose-400",
    };
  }

  if (blundersPerGame > 3 && isImproving) {
    return {
      style: "Tactical Berserker",
      description: "You attack relentlessly and take risks others avoid. Wild, unpredictable, and dangerous — but watch your back ranks.",
      icon: "⚔️",
      color: "text-red-400",
    };
  }

  if (blundersPerGame < 1.5 && isImproving) {
    return {
      style: "Solid Positional Player",
      description: "Controlled, precise, and patient. You think before you move and build every position on solid foundations.",
      icon: "🏰",
      color: "text-emerald-400",
    };
  }

  if (blundersPerGame < 2 && !isImproving) {
    return {
      style: "Passive Defender",
      description: "Safety first — you rarely blunder but rarely seize the initiative either. Push yourself to be more active.",
      icon: "🛡️",
      color: "text-sky-400",
    };
  }

  return {
    style: "Balanced Strategist",
    description: "You blend tactics with strategy and attack with defense. A versatile player steadily rising through the ranks.",
    icon: "⚖️",
    color: "text-violet-400",
  };
}

// ── Stats computation ─────────────────────────────────────────────────────────

export function extractDestinationSquare(san: string): string | null {
  if (san.startsWith("O-O")) return null;
  const match = san.match(/([a-h][1-8])(?:=[QRBN])?[+#!?]*$/);
  return match?.[1] ?? null;
}

export function computeImprovementPercent(
  previousAvg: number,
  currentGame: number,
): number | null {
  if (previousAvg === 0) return null;
  return Math.round(((previousAvg - currentGame) / previousAvg) * 100);
}

export function aggregateBySquare(
  blunders: Array<{ square: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { square } of blunders) {
    counts[square] = (counts[square] ?? 0) + 1;
  }
  return counts;
}

export function computeNewUserStats(
  existing: UserStats | null,
  userId: string,
  sessionBlunders: SessionBlunder[],
): UserStats {
  const currentGameBlunders = sessionBlunders.length;
  const previousTotalGames = existing?.totalGames ?? 0;
  const previousTotalBlunders = existing?.totalBlunders ?? 0;
  const previousAvg =
    previousTotalGames > 0 ? previousTotalBlunders / previousTotalGames : 0;
  const improvementPercent =
    computeImprovementPercent(previousAvg, currentGameBlunders) ?? 0;

  const blundersBySquare = { ...(existing?.blundersBySquare ?? {}) };
  for (const { square } of sessionBlunders) {
    blundersBySquare[square] = (blundersBySquare[square] ?? 0) + 1;
  }

  // ── Streak: consecutive games with 0 blunders ──
  const cleanGameStreak =
    currentGameBlunders === 0 ? (existing?.cleanGameStreak ?? 0) + 1 : 0;

  // ── Daily challenge: play 1 game without blunders ──
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const challengeCompleted = currentGameBlunders === 0;
  const alreadyCompletedToday = existing?.lastCompletedDate === today;

  let lastCompletedDate = existing?.lastCompletedDate;
  let streakDays = existing?.streakDays ?? 0;

  if (challengeCompleted && !alreadyCompletedToday) {
    lastCompletedDate = today;
    streakDays = existing?.lastCompletedDate === yesterday ? streakDays + 1 : 1;
  }

  return {
    userId,
    totalGames: previousTotalGames + 1,
    totalBlunders: previousTotalBlunders + currentGameBlunders,
    blundersBySquare,
    lastGameBlunders: currentGameBlunders,
    previousAvgBlunders: previousAvg,
    improvementPercent,
    cleanGameStreak,
    lastCompletedDate,
    streakDays,
  };
}

// ── Heatmap helpers ───────────────────────────────────────────────────────────

function intensityToBackground(intensity: number): string {
  const alpha = 0.25 + intensity * 0.55;
  const green = Math.round(220 * (1 - intensity));
  return `rgba(239, ${green}, 10, ${alpha.toFixed(2)})`;
}

function countsToStyles(
  counts: Record<string, number>,
): Record<string, CSSProperties> {
  const max = Math.max(...Object.values(counts), 1);
  const styles: Record<string, CSSProperties> = {};
  for (const [square, count] of Object.entries(counts)) {
    styles[square] = { background: intensityToBackground(count / max) };
  }
  return styles;
}

export function computeHeatmapStyles(
  blundersBySquare: Record<string, number>,
): Record<string, CSSProperties> {
  return countsToStyles(blundersBySquare);
}

export function computeSessionHeatmapStyles(
  blunders: Array<{ square: string }>,
): Record<string, CSSProperties> {
  return countsToStyles(aggregateBySquare(blunders));
}

export function computeDiffStyles(
  sessionBySquare: Record<string, number>,
  historicalBySquare: Record<string, number>,
): Record<string, CSSProperties> {
  const styles: Record<string, CSSProperties> = {};

  for (const square of Object.keys(historicalBySquare)) {
    styles[square] = sessionBySquare[square]
      ? { background: "rgba(239, 68, 68, 0.75)" }
      : { background: "rgba(34, 197, 94, 0.55)" };
  }

  for (const square of Object.keys(sessionBySquare)) {
    if (!historicalBySquare[square]) {
      styles[square] = { background: "rgba(245, 158, 11, 0.65)" };
    }
  }

  return styles;
}

export function getStoppedSquares(
  sessionBySquare: Record<string, number>,
  historicalBySquare: Record<string, number>,
): string[] {
  return Object.keys(historicalBySquare).filter((sq) => !sessionBySquare[sq]);
}

export function getProblematicSquares(
  sessionBySquare: Record<string, number>,
  historicalBySquare: Record<string, number>,
): string[] {
  return Object.keys(historicalBySquare).filter((sq) => !!sessionBySquare[sq]);
}
