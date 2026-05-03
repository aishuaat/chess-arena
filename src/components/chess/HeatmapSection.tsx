import type { CSSProperties } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

type HeatmapSectionProps = {
  styles: Record<string, CSSProperties>;
};

export function HeatmapSection({ styles }: HeatmapSectionProps) {
  const hasData = Object.keys(styles).length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:border-white/5 dark:bg-[#111827] dark:hover:border-white/10">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Weak Squares — All Time
        </p>
        {hasData && (
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-16 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, rgba(239,220,10,0.5), rgba(239,10,10,0.9))",
              }}
            />
            <span className="text-[10px] text-slate-400">low → high</span>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <div className="relative">
          {hasData && (
            <div
              className="absolute inset-0 -z-10 rounded-xl blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 70%)",
              }}
            />
          )}
          <div
            className="overflow-hidden rounded-lg"
            style={{ width: "min(100%, 320px)" }}
          >
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
            >
              {RANKS.flatMap((rank) =>
                FILES.map((file) => {
                  const square = `${file}${rank}`;
                  const isLight = (FILES.indexOf(file) + rank) % 2 === 0;
                  return (
                    <div
                      key={square}
                      className="relative aspect-square"
                      style={{
                        backgroundColor: isLight ? "#d8d0c4" : "#a89880",
                        ...styles[square],
                      }}
                    >
                      {rank === 1 && (
                        <span className="absolute bottom-0.5 right-0.5 select-none text-[6px] font-semibold text-black/30">
                          {file}
                        </span>
                      )}
                      {file === "a" && (
                        <span className="absolute left-0.5 top-0.5 select-none text-[6px] font-semibold text-black/30">
                          {rank}
                        </span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>

      {!hasData && (
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-600">
          Play more games to reveal your weak squares.
        </p>
      )}
    </div>
  );
}

export default HeatmapSection;
