export type BlunderBankItem = {
  fen: string;
  bestMove: string;
  userMove: string;
  type: "mistake" | "blunder";
};

type BlunderBankProps = {
  blunders: BlunderBankItem[];
  onSolve?: (item: BlunderBankItem) => void;
};

export function BlunderBank({ blunders, onSolve }: BlunderBankProps) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
        Blunder Bank
      </h3>

      <div className="mt-3 space-y-2">
        {blunders.length > 0 ? (
          blunders.map((item, index) => (
            <article
              key={`${item.fen}-${index}`}
              className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold capitalize text-slate-950 dark:text-slate-50">
                    {item.type}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Your move: {item.userMove}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Best move: {item.bestMove || "none"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSolve?.(item)}
                  className="rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  Retry
                </button>
              </div>

              <p className="mt-3 break-all rounded bg-white px-2 py-1 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-500">
                FEN: {item.fen}
              </p>
            </article>
          ))
        ) : (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-500">
            No errors yet.
          </p>
        )}
      </div>
    </section>
  );
}

export default BlunderBank;
