"use client";

import { useEffect, useRef, useState } from "react";
import type { TopMove } from "@/lib/stockfish";
import { getTopMoves } from "@/lib/stockfish";
import type { GameTree } from "@/lib/GameTreeManager";
import { getPathFromRoot, applyUci } from "@/lib/GameTreeManager";

type AnalysisPhase = "finding" | "alternatives" | "done";

type ExploreTarget =
  | { type: "history"; index: number }
  | { type: "branch"; nodeId: string };

type Props = {
  fen: string;
  tree: GameTree;
  exploreTarget: ExploreTarget;
  mainLineNodeIds: string[];
  onPlayMove: (san: string, uci: string, newFen: string, evalScore: number, parentNodeId: string) => void;
  onNavigateBranch: (nodeId: string) => void;
  onClose: () => void;
};

export function WhatIfPanel({
  fen,
  tree,
  exploreTarget,
  mainLineNodeIds,
  onPlayMove,
  onNavigateBranch,
  onClose,
}: Props) {
  const [suggestions, setSuggestions] = useState<TopMove[]>([]);
  const [phase, setPhase] = useState<AnalysisPhase>("finding");
  const [error, setError] = useState<string | null>(null);
  const lastFenRef = useRef<string>("");

  useEffect(() => {
    if (fen === lastFenRef.current) return;
    lastFenRef.current = fen;

    setSuggestions([]);
    setError(null);
    setPhase("finding");

    let cancelled = false;

    getTopMoves(fen, 3, {
      movetime: 300,
      onPartial: (partial) => {
        if (!cancelled) {
          setSuggestions(partial);
          setPhase("alternatives");
        }
      },
    })
      .then((moves) => {
        if (!cancelled) {
          setSuggestions(moves);
          setPhase("done");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not analyze position.");
          setPhase("done");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fen]);

  // Derive the parent node ID for branching
  const parentNodeId: string = (() => {
    if (exploreTarget.type === "branch") return exploreTarget.nodeId;
    const idx = exploreTarget.index;
    return mainLineNodeIds[idx] ?? "root";
  })();

  // Path label
  const pathLabel = (() => {
    if (exploreTarget.type === "branch") {
      const path = getPathFromRoot(tree, exploreTarget.nodeId).slice(1);
      if (path.length === 0) return "Starting position";
      return buildPathLabel(path.map((n) => n.san ?? "?"));
    }
    return "After selected move";
  })();

  // Children of current node (existing branches to navigate)
  const branchChildren =
    exploreTarget.type === "branch"
      ? (tree.nodes[exploreTarget.nodeId]?.children ?? [])
          .map((id) => tree.nodes[id])
          .filter(Boolean)
      : [];

  function handlePlay(move: TopMove) {
    if (!move.san) return;
    const newFen = applyUci(fen, move.uci);
    if (!newFen) return;
    onPlayMove(move.san, move.uci, newFen, move.eval, parentNodeId);
  }

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 dark:bg-violet-950/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
            What If Explorer
          </span>
          <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">
            BETA
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close explorer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Position context */}
        <p className="text-[11px] text-slate-500 truncate">{pathLabel}</p>

        {/* Suggestions */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Stockfish top moves
          </p>

          {/* Phase: finding best move */}
          {phase === "finding" && (
            <div className="flex items-center gap-2 py-3">
              <Spinner />
              <span className="text-xs text-slate-500">⚡ Finding best move…</span>
            </div>
          )}

          {/* Phase: have best move, loading rest */}
          {phase !== "finding" && suggestions.map((move, i) => (
            <SuggestionRow
              key={move.uci}
              move={move}
              rank={i + 1}
              onPlay={() => handlePlay(move)}
            />
          ))}

          {phase === "alternatives" && suggestions.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Spinner small />
              <span className="text-[11px] text-slate-400">⏳ Loading alternatives…</span>
            </div>
          )}

          {error && phase === "done" && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Existing branches to navigate */}
        {branchChildren.length > 0 && (
          <div className="space-y-1.5 border-t border-slate-200/30 pt-3 dark:border-slate-700/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Explored branches
            </p>
            <div className="flex flex-wrap gap-1.5">
              {branchChildren.map((node) =>
                node && (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onNavigateBranch(node.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/8 px-2.5 py-1 text-xs font-medium text-violet-400 transition-colors hover:border-violet-500/40 hover:bg-violet-500/15"
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="opacity-60">
                      <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878z"/>
                    </svg>
                    {node.san}
                    {node.eval !== null && (
                      <span className={`text-[10px] ${evalColor(node.eval)}`}>
                        {formatEval(node.eval)}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Return hint */}
        <button
          type="button"
          onClick={onClose}
          className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-400"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"/>
          </svg>
          Return to game
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SuggestionRow({
  move,
  rank,
  onPlay,
}: {
  move: TopMove;
  rank: number;
  onPlay: () => void;
}) {
  const rankColors = ["text-amber-400", "text-slate-400", "text-slate-500"];

  return (
    <div className="group flex items-center gap-2 rounded-lg border border-slate-200/50 bg-white/60 px-3 py-2 transition-all dark:border-slate-700/50 dark:bg-slate-800/40">
      <span className={`w-3 shrink-0 text-center text-[10px] font-bold ${rankColors[rank - 1]}`}>
        {rank}
      </span>

      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
          {move.san ?? move.uci}
        </span>
        <EvalPill value={move.eval} />
      </div>

      <EvalBar value={move.eval} />

      <button
        type="button"
        onClick={onPlay}
        disabled={!move.san}
        className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Play
      </button>
    </div>
  );
}

function EvalPill({ value }: { value: number }) {
  return (
    <span className={`text-xs font-mono ${evalColor(value)}`}>
      {formatEval(value)}
    </span>
  );
}

function EvalBar({ value }: { value: number }) {
  const clamped = Math.max(-5, Math.min(5, value));
  const pct = ((clamped + 5) / 10) * 100;
  return (
    <div className="relative h-1 w-12 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all"
        style={{
          width: `${pct}%`,
          backgroundColor: value > 0.3 ? "#10b981" : value < -0.3 ? "#ef4444" : "#6b7280",
        }}
      />
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  const size = small ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <svg
      className={`${size} animate-spin text-violet-400`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function formatEval(e: number): string {
  if (e >= 90) return "M";
  if (e <= -90) return "-M";
  const sign = e >= 0 ? "+" : "";
  return `${sign}${e.toFixed(1)}`;
}

function evalColor(e: number): string {
  if (e > 0.3) return "text-emerald-500 dark:text-emerald-400";
  if (e < -0.3) return "text-red-500 dark:text-red-400";
  return "text-slate-400";
}

function buildPathLabel(sans: string[]): string {
  let label = "";
  sans.forEach((san, i) => {
    if (i % 2 === 0) label += `${Math.floor(i / 2) + 1}. `;
    label += san + " ";
  });
  return label.trim();
}

export default WhatIfPanel;
