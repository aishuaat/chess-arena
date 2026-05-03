type ImprovementCardProps = {
  improvementPercent: number;
  lastGameBlunders: number;
  previousAvgBlunders: number;
  problematicSquares: string[];
  stoppedSquares: string[];
};

export function ImprovementCard({
  improvementPercent,
  lastGameBlunders,
  previousAvgBlunders,
  stoppedSquares,
  problematicSquares,
}: ImprovementCardProps) {
  const isFirstGame = previousAvgBlunders === 0;
  const improved = improvementPercent > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md dark:border-white/5 dark:bg-[#111827] dark:hover:border-white/10">
      <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Performance
      </p>

      {isFirstGame ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-4 dark:border-violet-500/20 dark:bg-violet-500/5">
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Baseline recorded</p>
          <p className="mt-1 text-xs text-slate-500">
            {lastGameBlunders} blunder{lastGameBlunders !== 1 ? "s" : ""} logged. Future games will be compared against this.
          </p>
        </div>
      ) : (
        <div
          className={`relative overflow-hidden rounded-lg px-5 py-5 ${
            improved
              ? "border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
              : "border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5"
          }`}
        >
          <div
            className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${
              improved ? "bg-emerald-400/20 dark:bg-emerald-500/10" : "bg-red-400/20 dark:bg-red-500/10"
            }`}
          />
          <p
            className={`text-3xl font-bold ${
              improved
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {improved ? `+${improvementPercent}%` : `${improvementPercent}%`}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {improved ? "improvement" : "regression"} vs your average
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Blunders reduced from{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {previousAvgBlunders.toFixed(1)}
            </span>{" "}
            →{" "}
            <span
              className={`font-semibold ${
                improved
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {lastGameBlunders}
            </span>
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-[#0B0F19]">
          <p className="text-xs text-slate-500">Last game</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{lastGameBlunders}</p>
          <p className="text-xs text-slate-400">blunders</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-[#0B0F19]">
          <p className="text-xs text-slate-500">Your average</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {isFirstGame ? "—" : previousAvgBlunders.toFixed(1)}
          </p>
          <p className="text-xs text-slate-400">blunders / game</p>
        </div>
      </div>

      {(stoppedSquares.length > 0 || problematicSquares.length > 0) && (
        <div className="mt-4 space-y-3">
          {stoppedSquares.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Fixed squares
              </p>
              <div className="flex flex-wrap gap-1.5">
                {stoppedSquares.map((sq) => (
                  <span
                    key={sq}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    {sq}
                  </span>
                ))}
              </div>
            </div>
          )}
          {problematicSquares.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                Still problematic
              </p>
              <div className="flex flex-wrap gap-1.5">
                {problematicSquares.map((sq) => (
                  <span
                    key={sq}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-xs font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                  >
                    {sq}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ImprovementCard;
