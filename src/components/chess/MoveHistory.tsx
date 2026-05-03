"use client";

import type { Move } from "chess.js";
import type { GameTree } from "@/lib/GameTreeManager";
import { hasBranches } from "@/lib/GameTreeManager";

type ExploreTarget =
  | { type: "history"; index: number }
  | { type: "branch"; nodeId: string };

type Props = {
  history: Move[];
  tree: GameTree;
  mainLineNodeIds: string[];
  exploreTarget: ExploreTarget | null;
  onSelectHistory: (index: number) => void;
  onSelectBranch: (nodeId: string) => void;
};

export function MoveHistory({
  history,
  tree,
  mainLineNodeIds,
  exploreTarget,
  onSelectHistory,
  onSelectBranch,
}: Props) {
  if (history.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-500">No moves yet.</p>
    );
  }

  // Group moves into pairs: [[white, black?], ...]
  const pairs: Array<{ num: number; white: Move; black: Move | null }> = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ num: i / 2 + 1, white: history[i]!, black: history[i + 1] ?? null });
  }

  return (
    <div className="space-y-0.5 text-sm">
      {pairs.map(({ num, white, black }) => {
        const whiteIdx = (num - 1) * 2;
        const blackIdx = whiteIdx + 1;
        const whiteNodeId = mainLineNodeIds[whiteIdx];
        const blackNodeId = mainLineNodeIds[blackIdx];

        const whiteActive =
          exploreTarget?.type === "history" && exploreTarget.index === whiteIdx;
        const blackActive =
          exploreTarget?.type === "history" && exploreTarget.index === blackIdx;

        const whiteBranchBadge = whiteNodeId ? hasBranches(tree, whiteNodeId) : false;
        const blackBranchBadge = blackNodeId && black ? hasBranches(tree, blackNodeId) : false;

        // Branch children of white/black nodes (for inline display)
        const whiteBranches = whiteNodeId
          ? (tree.nodes[whiteNodeId]?.children.slice(1) ?? []).map((id) => tree.nodes[id]).filter(Boolean)
          : [];
        const blackBranches = blackNodeId && black
          ? (tree.nodes[blackNodeId]?.children.slice(1) ?? []).map((id) => tree.nodes[id]).filter(Boolean)
          : [];

        return (
          <div key={num}>
            {/* Main move pair row */}
            <div className="flex items-center gap-1">
              <span className="w-6 shrink-0 text-right text-xs text-slate-500 dark:text-slate-600">
                {num}.
              </span>

              <MoveChip
                san={white.san}
                active={whiteActive}
                hasBranch={whiteBranchBadge}
                onClick={() => onSelectHistory(whiteIdx)}
              />

              {black && (
                <MoveChip
                  san={black.san}
                  active={blackActive}
                  hasBranch={blackBranchBadge}
                  onClick={() => onSelectHistory(blackIdx)}
                />
              )}
            </div>

            {/* Inline branch moves */}
            {whiteBranches.length > 0 && (
              <div className="ml-7 mt-0.5 flex flex-wrap gap-1 border-l-2 border-violet-500/30 pl-2">
                {whiteBranches.map((node) => {
                  if (!node) return null;
                  const branchActive =
                    exploreTarget?.type === "branch" && exploreTarget.nodeId === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onSelectBranch(node.id)}
                      className={`rounded px-1.5 py-0.5 font-mono text-xs transition-colors ${
                        branchActive
                          ? "bg-violet-500/20 text-violet-300"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      }`}
                    >
                      {num}. {node.san}
                    </button>
                  );
                })}
              </div>
            )}

            {blackBranches.length > 0 && (
              <div className="ml-7 mt-0.5 flex flex-wrap gap-1 border-l-2 border-violet-500/30 pl-2">
                {blackBranches.map((node) => {
                  if (!node) return null;
                  const branchActive =
                    exploreTarget?.type === "branch" && exploreTarget.nodeId === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onSelectBranch(node.id)}
                      className={`rounded px-1.5 py-0.5 font-mono text-xs transition-colors ${
                        branchActive
                          ? "bg-violet-500/20 text-violet-300"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      }`}
                    >
                      {num}...{node.san}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MoveChip({
  san,
  active,
  hasBranch,
  onClick,
}: {
  san: string;
  active: boolean;
  hasBranch: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-xs font-medium transition-all duration-100 ${
        active
          ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {san}
      {hasBranch && (
        <span
          className={`ml-0.5 inline-block h-1 w-1 rounded-full ${
            active ? "bg-white/70" : "bg-violet-400 dark:bg-violet-500"
          }`}
          title="Has alternative branches"
        />
      )}
    </button>
  );
}

export default MoveHistory;
