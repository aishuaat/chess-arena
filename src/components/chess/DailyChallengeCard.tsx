"use client";

import type { UserStats } from "@/lib/analytics";

const CHALLENGE_GOAL = "Play 1 game without blunders";

type Props = { userStats: UserStats | null };

export function DailyChallengeCard({ userStats }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = userStats?.lastCompletedDate === today;
  const streak = userStats?.streakDays ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-white/5 dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Daily Challenge
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            {CHALLENGE_GOAL}
          </p>
          {streak > 0 && (
            <p className="mt-1 text-xs font-medium text-amber-500">
              🔥 {streak} day{streak !== 1 ? "s" : ""} streak
            </p>
          )}
        </div>

        <div className="shrink-0">
          {completedToday ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              Completed ✔
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5">
              Not yet
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
          style={{ width: completedToday ? "100%" : "0%" }}
        />
      </div>
    </div>
  );
}

export default DailyChallengeCard;
