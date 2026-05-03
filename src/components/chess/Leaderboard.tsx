"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/firebase";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({ userId, top = 5 }: { userId: string; top?: number }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard(top)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [top]);

  return (
    <article className="flex h-full flex-col rounded-xl border border-purple-200 bg-white p-6 shadow-sm dark:border-purple-800 dark:bg-[#0B1220]">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-xl">
          🏆
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Leaderboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Top {top} players</p>
        </div>
      </div>

      {/* List */}
      <div className="mt-5 flex-1 space-y-1">
        {loading
          ? Array.from({ length: top }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
            ))
          : entries.map((entry, i) => {
              const isMe = entry.uid === userId;
              return (
                <div
                  key={entry.uid}
                  className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                    isMe ? "bg-purple-100 dark:bg-purple-900" : ""
                  }`}
                >
                  <span className="w-5 shrink-0 text-center text-sm">
                    {i < 3 ? MEDALS[i] : <span className="font-bold text-slate-400">{i + 1}</span>}
                  </span>
                  <span
                    className={`flex-1 truncate text-sm font-semibold ${
                      isMe
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {entry.displayName}
                    {isMe && (
                      <span className="ml-1 text-[10px] font-normal text-indigo-400">(you)</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs font-bold text-slate-500 dark:text-slate-400">
                    {(entry.points ?? 0).toLocaleString()} pts
                  </span>
                </div>
              );
            })}
      </div>
    </article>
  );
}

export default Leaderboard;
