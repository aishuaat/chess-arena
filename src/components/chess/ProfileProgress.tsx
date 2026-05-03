"use client";

import type { UserStats } from "@/lib/analytics";
import { computeLevel, computePlayStyle } from "@/lib/analytics";

type Props = {
  userStats: UserStats;
};

export function ProfileProgress({ userStats }: Props) {
  const lvl = computeLevel(userStats.totalGames);
  const style = computePlayStyle(userStats);
  const streak = userStats.cleanGameStreak ?? 0;

  const progressPct = lvl.isMaxLevel
    ? 100
    : (lvl.gamesInLevel / lvl.gamesPerLevel) * 100;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#0B1220]">
      {/* ── Level row ── */}
      <div className="flex items-center gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <LevelBadge level={lvl.level} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {lvl.title}
            </span>
            {lvl.isMaxLevel ? (
              <span className="shrink-0 text-[11px] font-medium text-indigo-500 dark:text-indigo-400">
                Max level
              </span>
            ) : (
              <span className="shrink-0 text-[11px] text-gray-500 dark:text-slate-500">
                {lvl.gamesInLevel}/{lvl.gamesPerLevel} games
              </span>
            )}
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-500">
            {lvl.isMaxLevel
              ? "You've reached the top. Keep your streak alive."
              : `${lvl.gamesPerLevel - lvl.gamesInLevel} more game${lvl.gamesPerLevel - lvl.gamesInLevel !== 1 ? "s" : ""} to next level`}
          </p>
        </div>
      </div>

      {/* ── Streak + DNA row ── */}
      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        {/* Streak */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-500">
            Clean Streak
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            {streak > 0 && (
              <span className="text-xl leading-none" aria-hidden>🔥</span>
            )}
            <span
              className={`text-3xl font-bold tabular-nums leading-none ${
                streak > 0
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-gray-300 dark:text-slate-600"
              }`}
            >
              {streak}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] text-gray-500 dark:text-slate-500">
            {streak === 0
              ? "No blunders in a row yet"
              : `${streak} consecutive ${streak === 1 ? "game" : "games"} with 0 blunders`}
          </p>

          {streak >= 3 && (
            <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              On fire!
            </span>
          )}
        </div>

        {/* Play Style DNA */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-500">
            Play Style DNA
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg leading-none" aria-hidden>{style.icon}</span>
            <span className={`text-sm font-bold ${style.color}`}>
              {style.style}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">
            {style.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Level badge ───────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: number }) {
  return (
    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10">
      <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-500">
        LV
      </span>
      <span className="text-lg font-bold leading-none text-indigo-600 dark:text-indigo-400">
        {level}
      </span>
    </div>
  );
}

export default ProfileProgress;
