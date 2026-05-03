type StatsProps = {
  blunders: number;
  mistakes: number;
  preventedErrors: number;
};

export function Stats({ blunders, mistakes, preventedErrors }: StatsProps) {
  const totalErrors = blunders + mistakes + preventedErrors;
  const improvement =
    totalErrors === 0 ? 100 : Math.round((preventedErrors / totalErrors) * 100);

  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
        Post-game report
      </h3>

      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-white p-3 dark:bg-slate-950">
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
              Blunders
            </p>
            <p className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">
              {blunders}
            </p>
          </div>

          <div className="rounded-md bg-white p-3 dark:bg-slate-950">
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
              Mistakes
            </p>
            <p className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">
              {mistakes}
            </p>
          </div>

          <div className="rounded-md bg-white p-3 dark:bg-slate-950">
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
              Prevented
            </p>
            <p className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">
              {preventedErrors}
            </p>
          </div>
        </div>

        <p className="mt-4 font-medium text-slate-950 dark:text-slate-50">
          Ты улучшился на {improvement}%
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${improvement}%` }}
          />
        </div>
      </div>
    </section>
  );
}

export default Stats;
