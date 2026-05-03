import type { GameRecord } from "@/hooks/useGameHistory";

type GameHistoryProps = {
  games: GameRecord[];
  isLoading: boolean;
};

export function GameHistory({ games, isLoading }: GameHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-[#111827]"
          />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center shadow-sm dark:border-white/5 dark:bg-[#111827]">
        <p className="text-sm text-slate-500">No games recorded yet.</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-600">
          Finish a game to see your history here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((game) => (
        <GameRow key={game.id} game={game} />
      ))}
    </div>
  );
}

function GameRow({ game }: { game: GameRecord }) {
  const date = game.createdAt ? relativeTime(game.createdAt.toMillis()) : "—";

  const resultConfig = {
    win: {
      label: "Win",
      dot: "bg-emerald-500",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/8 dark:text-emerald-400",
    },
    loss: {
      label: "Loss",
      dot: "bg-red-500",
      badge:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/8 dark:text-red-400",
    },
    draw: {
      label: "Draw",
      dot: "bg-slate-400",
      badge:
        "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/40 dark:bg-slate-700/20 dark:text-slate-400",
    },
  }[game.result];

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all duration-150 hover:scale-[1.01] hover:border-slate-300 hover:shadow-md dark:border-white/5 dark:bg-[#111827] dark:hover:border-white/10">
      <span
        className={`inline-flex min-w-[52px] items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${resultConfig.badge}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${resultConfig.dot}`} />
        {resultConfig.label}
      </span>

      <div className="flex flex-1 items-center gap-6">
        <Metric label="Moves" value={game.movesCount} />
        <Metric
          label="Blunders"
          value={game.blundersCount}
          warn={game.blundersCount > 3}
        />
      </div>

      <span className="ml-auto text-xs text-slate-400 transition-colors group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-500">
        {date}
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`text-sm font-bold ${
          warn ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
        }`}
      >
        {value}
      </span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(ms),
  );
}

export default GameHistory;
