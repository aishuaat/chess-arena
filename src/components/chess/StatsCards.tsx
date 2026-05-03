import type { UserStats } from "@/lib/analytics";

type StatsCardsProps = {
  userStats: UserStats | null;
};

export function StatsCards({ userStats }: StatsCardsProps) {
  const improvement = userStats?.improvementPercent ?? null;
  const hasImprovement =
    userStats !== null && userStats.totalGames > 1 && improvement !== null;

  const cards = [
    {
      label: "Total Games",
      value: userStats?.totalGames ?? 0,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      iconColor: "text-violet-600 dark:text-violet-400",
      glow: "",
    },
    {
      label: "Total Blunders",
      value: userStats?.totalBlunders ?? 0,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      iconColor: "text-red-600 dark:text-red-400",
      glow: "",
    },
    {
      label: "Improvement",
      value: hasImprovement
        ? `${improvement! >= 0 ? "+" : ""}${improvement}%`
        : "—",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
      iconColor:
        hasImprovement && improvement! >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
      glow: "",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:shadow-md dark:border-white/5 dark:bg-[#111827] dark:hover:border-white/10"
        >
          <div className={`mb-3 ${card.iconColor}`}>{card.icon}</div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
          <p className="mt-1 text-xs text-slate-500">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;
