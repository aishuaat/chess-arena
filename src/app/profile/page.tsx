"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { useGameHistory } from "@/hooks/useGameHistory";
import { computeHeatmapStyles } from "@/lib/analytics";
import { fetchUserRankAndPoints } from "@/lib/firebase";
import AuthScreen from "@/components/chess/AuthScreen";
import ProfileHeader from "@/components/chess/ProfileHeader";
import StatsCards from "@/components/chess/StatsCards";
import ImprovementCard from "@/components/chess/ImprovementCard";
import HeatmapSection from "@/components/chess/HeatmapSection";
import GameHistory from "@/components/chess/GameHistory";
import ProfileProgress from "@/components/chess/ProfileProgress";

export default function ProfilePage() {
  const {
    isAuthLoading,
    isFirebaseConfigured,
    loginWithEmail,
    loginWithGoogle,
    signUpWithEmail,
    user,
  } = useAuth();
  const { userStats, isLoading: isStatsLoading } = useUserStats(user ?? null);
  const { games, isLoading: isGamesLoading } = useGameHistory(user ?? null);
  const [rankData, setRankData] = useState<{ rank: number; points: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchUserRankAndPoints(user.uid).then(setRankData);
  }, [user]);

  const heatmapStyles = userStats
    ? computeHeatmapStyles(userStats.blundersBySquare)
    : {};

  const hasHistory = userStats !== null && userStats.totalGames > 1;

  if (isAuthLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500 dark:bg-[#0B0F19]">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        isFirebaseConfigured={isFirebaseConfigured}
        loginWithEmail={loginWithEmail}
        loginWithGoogle={loginWithGoogle}
        signUpWithEmail={signUpWithEmail}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-200 dark:bg-[#0B0F19] dark:text-white">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">

        {/* Welcome greeting */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
            Your Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Welcome back, {user.displayName?.split(" ")[0] ?? "Player"} 👋
          </h1>
        </div>

        {/* Header card */}
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-colors dark:border-white/5 dark:bg-[#111827]">
          {isStatsLoading ? (
            <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
          ) : (
            <ProfileHeader user={user} userStats={userStats} />
          )}
        </div>

        {/* Stats row */}
        {isStatsLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white shadow-sm dark:bg-[#111827]" />
            ))}
          </div>
        ) : (
          <StatsCards userStats={userStats} />
        )}

        {/* Level · Streak · Play Style */}
        {isStatsLoading ? (
          <div className="h-44 animate-pulse rounded-xl bg-white shadow-sm dark:bg-[#111827]" />
        ) : userStats ? (
          <ProfileProgress userStats={userStats} />
        ) : null}

        {/* Improvement + Heatmap */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            {isStatsLoading ? (
              <div className="h-56 animate-pulse rounded-xl bg-white shadow-sm dark:bg-[#111827]" />
            ) : hasHistory ? (
              <ImprovementCard
                improvementPercent={userStats!.improvementPercent}
                lastGameBlunders={userStats!.lastGameBlunders}
                previousAvgBlunders={userStats!.previousAvgBlunders}
                stoppedSquares={[]}
                problematicSquares={[]}
              />
            ) : (
              <EmptyCard>
                Complete at least 2 games to see performance trends.
              </EmptyCard>
            )}
          </div>

          <div>
            {isStatsLoading ? (
              <div className="h-56 animate-pulse rounded-xl bg-white shadow-sm dark:bg-[#111827]" />
            ) : (
              <HeatmapSection styles={heatmapStyles} />
            )}
          </div>
        </div>

        {/* Rank + Points */}
        {rankData && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/5 dark:bg-[#111827]">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Your Rank
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-500">
                #{rankData.rank}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/5 dark:bg-[#111827]">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Points
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-500">
                {rankData.points.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Game history */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Game History
          </p>
          <GameHistory games={games} isLoading={isGamesLoading} />
        </div>

      </div>
    </main>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-white/5 dark:bg-[#111827]">
      {children}
    </div>
  );
}
