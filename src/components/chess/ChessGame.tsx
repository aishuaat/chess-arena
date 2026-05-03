"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { analyzePosition, getBestMove, preloadPosition } from "@/lib/stockfish";
import { playMoveByType } from "@/lib/sounds";
import { saveUserBlunder, updateUserStatsAfterGame, saveGame, updateUserPointsAfterGame } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { computeSessionHeatmapStyles, type UserStats } from "@/lib/analytics";
import {
  createTree,
  addNode,
  getPathFromRoot,
  type GameTree,
  INITIAL_FEN,
} from "@/lib/GameTreeManager";
import AuthScreen from "./AuthScreen";
import CreateGameButton from "./CreateGameButton";
import DailyChallengeCard from "./DailyChallengeCard";
import Leaderboard from "./Leaderboard";
import BlunderBank, { type BlunderBankItem } from "./BlunderBank";
import PuzzleMode, { type Puzzle } from "./PuzzleMode";
import Stats from "./Stats";
import MoveHistory from "./MoveHistory";
import WhatIfPanel from "./WhatIfPanel";
import { useChessGame } from "./useChessGame";

// ── Types ─────────────────────────────────────────────────────────────────────

type GameMode = "local" | "ai";
type GameScreen = "menu" | "game" | "puzzle";
type ErrorType = "mistake" | "blunder";
type HighlightedSquares = Record<string, CSSProperties>;
type MoveIssue = {
  fen: string;
  move: string;
  bestMove: string;
  type: ErrorType;
  square: string;
  pieceLost: string;
  severity: number;
  gameId: string;
};
type MoveAnalysisSummary = {
  move: string;
  bestMove: string;
  beforeEval: number;
  afterEval: number;
  loss: number;
  type: ErrorType | "good";
  coachExplanation: string;
};
type ExploreTarget =
  | { type: "history"; index: number }
  | { type: "branch"; nodeId: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const moveHighlight: CSSProperties = {
  background: "radial-gradient(circle, rgba(51,65,85,0.72) 18%, transparent 20%)",
};
const captureHighlight: CSSProperties = {
  background:
    "radial-gradient(circle, transparent 52%, rgba(239,68,68,0.9) 54%, rgba(239,68,68,0.9) 68%, transparent 70%)",
  boxShadow: "inset 0 0 0 4px rgba(239,68,68,0.55)",
};
const AI_MOVE_DELAY_MS = 2200;

const gameModes: Array<{
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  tags: string[];
}> = [
  {
    id: "ai",
    title: "Classic vs AI",
    description: "Stockfish opponent, move analysis, mistakes and blunders.",
    icon: "AI",
    tags: ["Stockfish", "Coach", "ELO"],
  },
  {
    id: "local",
    title: "Local Multiplayer",
    description: "Two players share one device and play both sides.",
    icon: "2P",
    tags: ["One device", "Hot seat"],
  },
];

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createCoachExplanation({
  move, bestMove, loss, type,
}: { move: string; bestMove: string; loss: number; type: ErrorType | "good" }) {
  if (type === "blunder")
    return `Coach: ${move} loses too much control. ${bestMove} was safer — manage the biggest risk first.`;
  if (type === "mistake")
    return `Coach: ${move} is playable, but ${bestMove} keeps a better activity/safety trade-off.`;
  return `Coach: ${move} looks stable. Eval loss is only ${loss.toFixed(2)}.`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChessGame() {
  const {
    fen, game, history, isGameOver, lastMove, loadFromMoves, makeMove, resetGame, status, undoMove,
  } = useChessGame();
  const {
    isAuthLoading, isFirebaseConfigured, loginWithEmail, loginWithGoogle, signUpWithEmail, user,
  } = useAuth();
  const { userStats } = useUserStats(user ?? null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const aiRequestIdRef = useRef(0);
  const gameIdRef = useRef<string>(crypto.randomUUID());
  const savedGameIdRef = useRef<string | null>(null);
  const blundersRef = useRef<MoveIssue[]>([]);
  const userStatsRef = useRef<UserStats | null>(null);
  const gameRef = useRef(game);
  const gameModeRef = useRef<GameMode>("ai");
  const historyRef = useRef(history);

  // Game tree: parallel to history, also holds branches
  const [gameTree, setGameTree] = useState<GameTree>(() => createTree(INITIAL_FEN));
  const mainLineNodeIds = useRef<string[]>([]); // nodeId at mainLineNodeIds[i] = tree node for history[i]

  // What If Explorer state
  const [exploreTarget, setExploreTarget] = useState<ExploreTarget | null>(null);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);

  // ── Game state ────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [gameMode, setGameMode] = useState<GameMode>("ai");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<HighlightedSquares>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<MoveAnalysisSummary | null>(null);
  const [blunders, setBlunders] = useState<MoveIssue[]>([]);
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [preventedErrors, setPreventedErrors] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [appliedMoveLabel, setAppliedMoveLabel] = useState<string | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");

  const sessionHeatmapStyles = useMemo(
    () => computeSessionHeatmapStyles(blunders),
    [blunders],
  );

  // ── Sync refs ─────────────────────────────────────────────────────────────
  useEffect(() => { blundersRef.current = blunders; }, [blunders]);
  useEffect(() => { userStatsRef.current = userStats; }, [userStats]);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { historyRef.current = history; }, [history]);

  // ── Sync game tree with history ───────────────────────────────────────────
  useEffect(() => {
    if (history.length === 0) {
      // Game was reset — rebuild empty tree
      mainLineNodeIds.current = [];
      setGameTree(createTree(INITIAL_FEN));
      return;
    }

    if (history.length < mainLineNodeIds.current.length) {
      // Undo: just truncate the nodeIds, keep tree nodes (they become orphaned)
      mainLineNodeIds.current = mainLineNodeIds.current.slice(0, history.length);
      return;
    }

    if (history.length <= mainLineNodeIds.current.length) return;

    // New moves: add them to the tree
    setGameTree((prev) => {
      let current = prev;
      let parentId = mainLineNodeIds.current.at(-1) ?? "root";

      for (let i = mainLineNodeIds.current.length; i < history.length; i++) {
        const move = history[i]!;
        const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
        const { tree: next, nodeId } = addNode(current, parentId, move.after, move.san, uci);
        current = next;
        parentId = nodeId;
        mainLineNodeIds.current.push(nodeId);
      }

      return current;
    });
  }, [history]);

  // ── Clear error messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (!errorMessage) return;
    const timer = window.setTimeout(() => setErrorMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (!appliedMoveLabel) return;
    const timer = window.setTimeout(() => setAppliedMoveLabel(null), 2500);
    return () => window.clearTimeout(timer);
  }, [appliedMoveLabel]);

  // ── Save game on end ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isGameOver || !user) return;
    // Guard: never save the same gameId twice (handles re-renders and remounts).
    if (savedGameIdRef.current === gameIdRef.current) return;
    savedGameIdRef.current = gameIdRef.current;

    const g = gameRef.current;
    const gm = gameModeRef.current;
    const result: "win" | "loss" | "draw" =
      g.isCheckmate() && gm === "ai"
        ? g.turn() === "w" ? "loss" : "win"
        : "draw";
    const blundersCount = blundersRef.current.length;
    void saveGame(user, gameIdRef.current, {
      result,
      movesCount: historyRef.current.length,
      blundersCount,
    });
    void updateUserStatsAfterGame(user, blundersRef.current, userStatsRef.current);
    void updateUserPointsAfterGame(user.uid, result, blundersCount);
  }, [isGameOver, user]);

  // ── Derived exploring state ───────────────────────────────────────────────
  const exploringFen: string | null = (() => {
    if (!exploreTarget) return null;
    if (exploreTarget.type === "history") return history[exploreTarget.index]?.after ?? null;
    return gameTree.nodes[exploreTarget.nodeId]?.fen ?? null;
  })();

  const isExploring = exploreTarget !== null;
  const displayFen = exploringFen ?? fen;

  // ── Game helpers ──────────────────────────────────────────────────────────
  function clearHighlights() {
    setSelectedSquare(null);
    setHighlightedSquares({});
  }

  function cancelAiThinking() {
    aiRequestIdRef.current += 1;
    setIsAiThinking(false);
  }

  function canHumanMove() {
    return gameMode === "local" || game.turn() === "w";
  }

  function getSquareHighlights(square: Square) {
    const moves = game.moves({ square, verbose: true }) as Move[];
    return moves.reduce<HighlightedSquares>((styles, move) => {
      styles[move.to] = move.captured ? captureHighlight : moveHighlight;
      return styles;
    }, {});
  }

  function playAiMove(bestMove: string, fenAfterUserMove: string) {
    const from = bestMove.slice(0, 2) as Square;
    const to = bestMove.slice(2, 4) as Square;
    const promotion = bestMove[4] as "q" | "r" | "b" | "n" | undefined;
    const move = makeMove(from, to, promotion, fenAfterUserMove);
    if (move) {
      playMoveByType(move.san, !!move.captured);
      preloadPosition(move.after);
    }
  }

  async function requestAiMove(fenAfterUserMove: string) {
    const requestId = aiRequestIdRef.current + 1;
    aiRequestIdRef.current = requestId;
    setIsAiThinking(true);
    try {
      await wait(AI_MOVE_DELAY_MS);
      const bestMove = await getBestMove(fenAfterUserMove, 10);
      if (aiRequestIdRef.current !== requestId) return;
      playAiMove(bestMove, fenAfterUserMove);
    } catch {
      setErrorMessage("AI could not move");
    } finally {
      if (aiRequestIdRef.current === requestId) setIsAiThinking(false);
    }
  }

  function classifyMoveLoss(loss: number): ErrorType | null {
    if (loss > 3) return "blunder";
    if (loss > 1.5) return "mistake";
    return null;
  }

  async function analyzeHumanMove(fenBeforeMove: string, move: Move) {
    setIsAnalyzing(true);
    try {
      const playerColor = fenBeforeMove.split(" ")[1];
      const [beforeAnalysis, afterAnalysis] = await Promise.all([
        analyzePosition(fenBeforeMove, 8),
        analyzePosition(move.after, 8),
      ]);
      const rawLoss =
        playerColor === "w"
          ? beforeAnalysis.evaluation - afterAnalysis.evaluation
          : afterAnalysis.evaluation - beforeAnalysis.evaluation;
      const loss = Math.max(0, rawLoss);
      const type = classifyMoveLoss(loss);

      setLastAnalysis({
        move: move.san,
        bestMove: beforeAnalysis.bestMove,
        beforeEval: beforeAnalysis.evaluation,
        afterEval: afterAnalysis.evaluation,
        loss,
        type: type ?? "good",
        coachExplanation: createCoachExplanation({
          move: move.san, bestMove: beforeAnalysis.bestMove, loss, type: type ?? "good",
        }),
      });

      if (!type) return;
      const blunder: MoveIssue = {
        fen: fenBeforeMove,
        move: move.san,
        bestMove: beforeAnalysis.bestMove,
        type,
        square: move.to,
        pieceLost: move.piece,
        severity: Math.round(loss * 100),
        gameId: gameIdRef.current,
      };
      setBlunders((prev) => [...prev, blunder]);
      if (user) void saveUserBlunder(user, blunder);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function maybeRequestAiMove(move: Move) {
    if (gameMode !== "ai") return;
    const next = new Chess(move.after);
    if (next.turn() === "b" && !next.isGameOver()) void requestAiMove(move.after);
  }

  function handleMove(sourceSquare: string, targetSquare: string) {
    if (isAiThinking || !canHumanMove() || isExploring) return false;
    const fenBeforeMove = game.fen();
    const move = makeMove(sourceSquare as Square, targetSquare as Square);
    clearHighlights();
    if (!move) { setErrorMessage("Invalid move"); return false; }
    playMoveByType(move.san, !!move.captured);
    void analyzeHumanMove(fenBeforeMove, move);
    maybeRequestAiMove(move);
    preloadPosition(move.after);
    return true;
  }

  function handleSquareClick(square: string) {
    if (isExploring) return;
    const clickedSquare = square as Square;
    if (isAiThinking || !canHumanMove()) { clearHighlights(); return; }
    if (selectedSquare) {
      if (selectedSquare === clickedSquare) { clearHighlights(); return; }
      if (highlightedSquares[clickedSquare]) { handleMove(selectedSquare, clickedSquare); return; }
    }
    const nextHighlights = getSquareHighlights(clickedSquare);
    if (Object.keys(nextHighlights).length === 0) { clearHighlights(); return; }
    setSelectedSquare(clickedSquare);
    setHighlightedSquares({
      [clickedSquare]: { boxShadow: "inset 0 0 0 4px rgba(250,204,21,0.9)" },
      ...nextHighlights,
    });
  }

  function handlePieceDrop(sourceSquare: string, targetSquare: string) {
    return handleMove(sourceSquare, targetSquare);
  }

  function resetSessionState() {
    cancelAiThinking();
    clearHighlights();
    setLastAnalysis(null);
    setBlunders([]);
    setPreventedErrors(0);
    setShowHeatmap(false);
    setExploreTarget(null);
    setIsWhatIfOpen(false);
    gameIdRef.current = crypto.randomUUID();
    mainLineNodeIds.current = [];
    setGameTree(createTree(INITIAL_FEN));
  }

  function handleStartMode(nextMode: GameMode) {
    resetSessionState();
    setGameMode(nextMode);
    resetGame();
    setScreen("game");
  }

  function handleBackToMenu() {
    cancelAiThinking();
    clearHighlights();
    setScreen("menu");
    setExploreTarget(null);
    setIsWhatIfOpen(false);
  }

  function handleSolveBlunder(item: BlunderBankItem) {
    setActivePuzzle({ fen: item.fen, bestMove: item.bestMove, userMove: item.userMove, type: item.type });
    setScreen("puzzle");
  }

  function handlePuzzleComplete(bestMove: string, puzzleFen: string) {
    const from = bestMove.slice(0, 2) as Square;
    const to = bestMove.slice(2, 4) as Square;
    const promotion = bestMove[4] as "q" | "r" | "b" | "n" | undefined;
    const move = makeMove(from, to, promotion, puzzleFen);
    if (move) {
      setLastAnalysis(null);
      setPreventedErrors((n) => n + 1);
      setBlunders((prev) => prev.filter((item) => item.fen !== puzzleFen));
      setActivePuzzle(null);
      maybeRequestAiMove(move);
      setScreen("game");
    }
  }

  function handleNewGame() {
    resetSessionState();
    resetGame();
  }

  function handlePlayAgain() {
    resetSessionState();
    resetGame();
  }

  function handleSwitchColors() {
    setBoardOrientation((prev) => (prev === "white" ? "black" : "white"));
    resetSessionState();
    resetGame();
  }

  // ── What If Explorer handlers ─────────────────────────────────────────────

  function handleSelectHistory(index: number) {
    setExploreTarget({ type: "history", index });
    setIsWhatIfOpen(true);
  }

  function handleSelectBranch(nodeId: string) {
    setExploreTarget({ type: "branch", nodeId });
    setIsWhatIfOpen(true);
  }

  function applyWhatIfMove(
    san: string,
    uci: string,
    newFen: string,
    evalScore: number,
    parentNodeId: string,
  ) {
    if (!exploreTarget) return;

    // Build the ordered move sequence that leads to the explored position.
    const replaySeq: Array<{ from: Square; to: Square; promotion?: string }> = [];

    if (exploreTarget.type === "history") {
      // Use the real history up through the explored index.
      const base = history.slice(0, exploreTarget.index + 1);
      for (const m of base) {
        replaySeq.push({ from: m.from, to: m.to, promotion: m.promotion });
      }
      // Truncate so the tree-sync useEffect will append the new move correctly.
      mainLineNodeIds.current = mainLineNodeIds.current.slice(0, exploreTarget.index + 1);
    } else {
      // Branch: walk the game tree from root to parentNodeId — every node has a UCI now.
      const path = getPathFromRoot(gameTree, parentNodeId).slice(1); // skip root
      for (const node of path) {
        const u = node.uci ?? "";
        replaySeq.push({
          from: u.slice(0, 2) as Square,
          to: u.slice(2, 4) as Square,
          promotion: u[4] || undefined,
        });
      }
      // Align mainLineNodeIds so the useEffect sees the right base length.
      mainLineNodeIds.current = getPathFromRoot(gameTree, parentNodeId)
        .slice(1)
        .map((n) => n.id);
    }

    // Append the chosen What If move.
    replaySeq.push({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci[4] || undefined,
    });

    // Apply to the main game (tree-sync useEffect will add the new node on next render).
    loadFromMoves(replaySeq);

    // Ensure the node exists in the tree for branch-nav continuity.
    setGameTree((prev) => {
      const { tree: next } = addNode(prev, parentNodeId, newFen, san, uci, evalScore);
      return next;
    });

    // Show toast, close explorer.
    setAppliedMoveLabel(san);
    handleCloseExplorer();

    // Trigger AI response when playing against the engine.
    try {
      const nextPosition = new Chess(newFen);
      if (gameMode === "ai" && nextPosition.turn() === "b" && !nextPosition.isGameOver()) {
        void requestAiMove(newFen);
      }
    } catch {
      // invalid FEN — skip AI trigger
    }
  }

  function handleCloseExplorer() {
    setExploreTarget(null);
    setIsWhatIfOpen(false);
  }

  // ── Auth / loading screens ────────────────────────────────────────────────

  if (isAuthLoading) {
    return (
      <section className="grid min-h-screen place-items-center bg-slate-100 p-4 text-slate-500 dark:bg-[#0B0F19] dark:text-slate-400">
        Loading...
      </section>
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

  // ── Menu screen ───────────────────────────────────────────────────────────

  if (screen === "menu") {
    return (
      <section className="mx-auto min-h-screen w-full bg-[#F8FAFC] p-6 text-gray-900 dark:bg-[#0B1220] dark:text-white">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
              Chess Arena
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Train Your Chess Intuition
            </h1>
            <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-slate-400">
              Three ways to play: train against AI with live analysis, share one device with a friend, or play online via link.
            </p>
          </header>

          <DailyChallengeCard userStats={userStats} />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {gameModes.map((mode) => (
              <article
                key={mode.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-[#0B1220] dark:hover:border-indigo-500/40"
              >
                <div className="flex gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {mode.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{mode.title}</h2>
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">{mode.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {mode.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-white/5 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleStartMode(mode.id)}
                  className="mt-auto pt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                >
                  Play
                </button>
              </article>
            ))}

            {/* Play with Friend via Link */}
            <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:shadow-md dark:border-gray-700 dark:bg-[#0B1220] dark:hover:border-emerald-500/40">
              <div className="flex gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  🔗
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Play with Friend</h2>
                  <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
                    Create a game and share the link. Play online in real time.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Online", "Realtime", "Share Link"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-white/5 dark:text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-6">
                {user ? (
                  <CreateGameButton user={user} />
                ) : (
                  <p className="text-xs text-gray-500">Sign in to create an online game.</p>
                )}
              </div>
            </article>

            {/* Leaderboard card */}
            <Leaderboard userId={user.uid} top={5} />
          </div>

          {/* ── How it works ── */}
          <div className="mt-10">
            <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">How it works</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: "♟",
                  title: "Play",
                  description: "Start a game against AI or a friend",
                  color: "from-indigo-500/20 to-purple-500/20",
                  text: "text-indigo-600 dark:text-indigo-400",
                },
                {
                  icon: "🔍",
                  title: "Analyze",
                  description: "See your mistakes instantly",
                  color: "from-amber-500/20 to-orange-500/20",
                  text: "text-amber-600 dark:text-amber-400",
                },
                {
                  icon: "📈",
                  title: "Improve",
                  description: "Climb the leaderboard and track progress",
                  color: "from-emerald-500/20 to-teal-500/20",
                  text: "text-emerald-600 dark:text-emerald-400",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#0B1220]"
                >
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${item.color} text-xl`}>
                    {item.icon}
                  </div>
                  <h3 className={`text-base font-bold ${item.text}`}>{item.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (screen === "puzzle" && activePuzzle) {
    return <PuzzleMode puzzle={activePuzzle} onComplete={handlePuzzleComplete} />;
  }

  // ── Game screen ───────────────────────────────────────────────────────────

  return (
    <section className="mx-auto grid min-h-screen w-full gap-6 bg-slate-100 p-4 dark:bg-[#0B0F19] lg:grid-cols-[minmax(320px,640px)_1fr]">
      {/* ── Board column ── */}
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {gameMode === "ai" ? "Classic vs AI" : "Local Multiplayer"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {gameMode === "ai" ? "You play white. AI plays black." : "Two players share this device."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBackToMenu}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Modes
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
          {isGameOver && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#111827] px-6 py-7 text-center shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {gameMode === "ai" ? "Classic vs AI" : "Local Multiplayer"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">Game Over</h2>
                <p className="mt-1 text-sm text-slate-400">{status}</p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handlePlayAgain}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
                  >
                    Play Again
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchColors}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-white/10 active:scale-95"
                  >
                    Switch Colors
                  </button>
                </div>
              </div>
            </div>
          )}

          {isExploring && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 dark:bg-violet-950/30">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                Exploring — board is read-only
              </span>
              <button
                type="button"
                onClick={handleCloseExplorer}
                className="ml-auto text-xs text-violet-500 hover:text-violet-400"
              >
                Exit
              </button>
            </div>
          )}

          {errorMessage && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </p>
          )}

          <Chessboard
            position={displayFen}
            onSquareClick={isExploring ? undefined : handleSquareClick}
            onPieceDrop={isExploring ? () => false : handlePieceDrop}
            arePiecesDraggable={!isExploring}
            boardOrientation={boardOrientation}
            customBoardStyle={{ borderRadius: "8px" }}
            customDarkSquareStyle={{ backgroundColor: "#557153" }}
            customLightSquareStyle={{ backgroundColor: "#f7e6c4" }}
            customSquareStyles={{
              ...(showHeatmap && !isExploring ? sessionHeatmapStyles : {}),
              ...(!isExploring ? highlightedSquares : {}),
            }}
          />
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Chess Game</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{user.displayName ?? "Signed in"}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {gameMode === "ai" ? "Mode: Play vs AI" : "Mode: Two players"}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{status}</p>
          </div>
          {appliedMoveLabel ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              ✓ Applied: {appliedMoveLabel}
            </span>
          ) : isGameOver ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-400/10 dark:text-amber-300">
              Game over
            </span>
          ) : isAiThinking ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              AI thinking
            </span>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={undoMove}
            disabled={history.length === 0 || isAiThinking || isExploring}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleNewGame}
            disabled={isAiThinking}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            New game
          </button>
        </div>

        {/* Last move */}
        {lastMove && !isExploring && (
          <div className="mt-5 rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Last move: <strong>{lastMove.san}</strong>
          </div>
        )}

        {/* Move analysis */}
        {!isExploring && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Move analysis
            </h3>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {isAnalyzing ? (
                <span>Analyzing position…</span>
              ) : lastAnalysis ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{lastAnalysis.move}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        lastAnalysis.type === "blunder"
                          ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                          : lastAnalysis.type === "mistake"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      }`}
                    >
                      {lastAnalysis.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Loss: {lastAnalysis.loss.toFixed(2)} | Best: {lastAnalysis.bestMove || "none"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Eval: {lastAnalysis.beforeEval.toFixed(2)} → {lastAnalysis.afterEval.toFixed(2)}
                  </p>
                  <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    {lastAnalysis.coachExplanation}
                  </p>
                </div>
              ) : (
                <span className="text-slate-500">Make a move to analyze it.</span>
              )}
            </div>
          </div>
        )}

        {/* ── Move history (tree-aware) ── */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Move history
            </h3>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setIsWhatIfOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  isWhatIfOpen
                    ? "bg-violet-600 text-white hover:bg-violet-500"
                    : "border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-violet-500 dark:hover:text-violet-400"
                }`}
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878z"/>
                </svg>
                What If
              </button>
            )}
          </div>

          <div className="mt-3 max-h-52 overflow-y-auto pr-1">
            <MoveHistory
              history={history}
              tree={gameTree}
              mainLineNodeIds={mainLineNodeIds.current}
              exploreTarget={isWhatIfOpen ? exploreTarget : null}
              onSelectHistory={isWhatIfOpen ? handleSelectHistory : () => {}}
              onSelectBranch={isWhatIfOpen ? handleSelectBranch : () => {}}
            />
          </div>
        </div>

        {/* ── What If Explorer panel ── */}
        {isWhatIfOpen && exploreTarget && exploringFen && (
          <div className="mt-4">
            <WhatIfPanel
              fen={exploringFen}
              tree={gameTree}
              exploreTarget={exploreTarget}
              mainLineNodeIds={mainLineNodeIds.current}
              onPlayMove={applyWhatIfMove}
              onNavigateBranch={handleSelectBranch}
              onClose={handleCloseExplorer}
            />
          </div>
        )}

        {/* ── Session heatmap ── */}
        {!isExploring && (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Session heatmap
              </h3>
              <button
                type="button"
                onClick={() => setShowHeatmap((v) => !v)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  showHeatmap
                    ? "bg-amber-500 text-white hover:bg-amber-400"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {showHeatmap ? "Hide" : "Show"}
              </button>
            </div>
            {showHeatmap && (
              <div className="mt-2">
                {blunders.length > 0 ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div
                      className="h-2.5 w-16 rounded"
                      style={{ background: "linear-gradient(to right, rgba(239,220,10,0.35), rgba(239,10,10,0.8))" }}
                    />
                    <span>{blunders.length} error{blunders.length !== 1 ? "s" : ""} — low → high</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No blunders yet this game.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── End-game stats ── */}
        {isGameOver && (
          <Stats
            blunders={blunders.filter((b) => b.type === "blunder").length}
            mistakes={blunders.filter((b) => b.type === "mistake").length}
            preventedErrors={preventedErrors}
          />
        )}

        {/* ── Blunder bank ── */}
        <div className="mt-5">
          <BlunderBank
            blunders={blunders.map((item) => ({
              fen: item.fen,
              bestMove: item.bestMove,
              userMove: item.move,
              type: item.type,
            }))}
            onSolve={handleSolveBlunder}
          />
        </div>
      </aside>
    </section>
  );
}

export default ChessGame;
