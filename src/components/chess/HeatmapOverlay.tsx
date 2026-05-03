export type HeatmapTab = "session" | "alltime" | "compare";

type HeatmapOverlayProps = {
  activeTab: HeatmapTab;
  improvementPercent: number | null;
  isAllTimeLoading: boolean;
  isVisible: boolean;
  sessionBlunderCount: number;
  totalBlunders: number;
  onTabChange: (tab: HeatmapTab) => void;
  onToggle: () => void;
};

const TABS: Array<{ id: HeatmapTab; label: string }> = [
  { id: "session", label: "This game" },
  { id: "alltime", label: "All time" },
  { id: "compare", label: "Compare" },
];

export function HeatmapOverlay({
  activeTab,
  improvementPercent,
  isAllTimeLoading,
  isVisible,
  sessionBlunderCount,
  totalBlunders,
  onTabChange,
  onToggle,
}: HeatmapOverlayProps) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
          Weak Squares
        </h3>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
            isVisible
              ? "bg-amber-500 text-white hover:bg-amber-400"
              : "border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          }`}
        >
          {isVisible ? "Hide" : "Show heatmap"}
        </button>
      </div>

      {isVisible && (
        <div className="mt-3 space-y-3">
          <div className="flex overflow-hidden rounded-md border border-slate-200 text-xs font-semibold dark:border-slate-700">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 py-1.5 transition ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            {activeTab === "session" && (
              <>
                {sessionBlunderCount === 0 ? (
                  <span>No blunders yet this game.</span>
                ) : (
                  <div className="space-y-2">
                    <p>
                      {sessionBlunderCount} blunder
                      {sessionBlunderCount !== 1 ? "s" : ""} this game.
                    </p>
                    <GradientLegend />
                  </div>
                )}
              </>
            )}

            {activeTab === "alltime" && (
              <>
                {isAllTimeLoading ? (
                  <span>Loading…</span>
                ) : totalBlunders === 0 ? (
                  <span>No history yet. Play more games to build your profile.</span>
                ) : (
                  <div className="space-y-2">
                    <p>{totalBlunders} total blunders across all sessions.</p>
                    {improvementPercent !== null && (
                      <p
                        className={`font-semibold ${
                          improvementPercent >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {improvementPercent >= 0
                          ? `You blunder ${improvementPercent}% less in recent games`
                          : `Blunders up ${Math.abs(improvementPercent)}% recently`}
                      </p>
                    )}
                    <GradientLegend />
                  </div>
                )}
              </>
            )}

            {activeTab === "compare" && (
              <div className="space-y-2">
                <p>Comparing this game vs your all-time history.</p>
                <div className="space-y-1">
                  <LegendRow color="rgba(34,197,94,0.55)" label="Improved — no blunder here this game" />
                  <LegendRow color="rgba(239,68,68,0.75)" label="Still problematic" />
                  <LegendRow color="rgba(245,158,11,0.65)" label="New issue this game" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GradientLegend() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-3 w-24 rounded"
        style={{
          background:
            "linear-gradient(to right, rgba(239,220,10,0.35), rgba(239,10,10,0.8))",
        }}
      />
      <span>low → high</span>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-3 w-3 shrink-0 rounded-sm"
        style={{ background: color }}
      />
      <span>{label}</span>
    </div>
  );
}

export default HeatmapOverlay;
