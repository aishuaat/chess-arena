"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchActiveGames, type ActiveGame, type PlayerProfile } from "@/lib/firebase";

function playerName(profile: PlayerProfile | undefined, fallback: string) {
  return profile?.name ?? fallback;
}

export default function ActiveGamesPage() {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveGames()
      .then(setGames)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-[#0B0F19]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Active Games
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Watch any ongoing game in real time.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-white shadow-sm dark:bg-[#111827]"
              />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-white/5 dark:bg-[#111827]">
            <p className="text-2xl">♟</p>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-white">
              No active games right now
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Check back later or start your own game.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => {
              const white = playerName(game.playerProfiles[game.players[0] ?? ""], "White");
              const black = playerName(game.playerProfiles[game.players[1] ?? ""], "Black");
              return (
                <div
                  key={game.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/5 dark:bg-[#111827]"
                >
                  <div className="flex flex-1 items-center gap-2 truncate">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {white}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-slate-400">vs</span>
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {black}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Playing
                  </span>
                  <Link
                    href={`/watch/${game.id}`}
                    className="shrink-0 rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-600 active:scale-95"
                  >
                    Watch
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
