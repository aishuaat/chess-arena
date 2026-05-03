"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";

export type Puzzle = {
  fen: string;
  bestMove: string;
  userMove: string;
  type: "mistake" | "blunder";
};

type PuzzleModeProps = {
  puzzle: Puzzle;
  onComplete: (bestMove: string, fen: string) => void;
};

type HighlightedSquares = Record<string, CSSProperties>;

const moveHighlight: CSSProperties = {
  background:
    "radial-gradient(circle, rgba(51,65,85,0.72) 18%, transparent 20%)",
};

const captureHighlight: CSSProperties = {
  background:
    "radial-gradient(circle, transparent 52%, rgba(239,68,68,0.9) 54%, rgba(239,68,68,0.9) 68%, transparent 70%)",
  boxShadow: "inset 0 0 0 4px rgba(239,68,68,0.55)",
};

function createPuzzleGame(fen: string) {
  try {
    return new Chess(fen);
  } catch {
    return new Chess();
  }
}

function normalizeMove(move: string) {
  return move.trim().toLowerCase();
}

export function PuzzleMode({ puzzle, onComplete }: PuzzleModeProps) {
  const [game, setGame] = useState(() => createPuzzleGame(puzzle.fen));
  const [message, setMessage] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [highlightedSquares, setHighlightedSquares] =
    useState<HighlightedSquares>({});

  function resetPuzzle() {
    setGame(createPuzzleGame(puzzle.fen));
    setMessage(null);
    setIsSolved(false);
    clearHighlights();
  }

  function clearHighlights() {
    setSelectedSquare(null);
    setHighlightedSquares({});
  }

  function getSquareHighlights(square: Square) {
    const moves = game.moves({ square, verbose: true }) as Move[];

    return moves.reduce<HighlightedSquares>((styles, move) => {
      styles[move.to] = move.captured ? captureHighlight : moveHighlight;
      return styles;
    }, {});
  }

  function handleMove(sourceSquare: string, targetSquare: string) {
    const nextGame = createPuzzleGame(game.fen());

    try {
      const move = nextGame.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });
      const userAnswer = `${move.from}${move.to}${move.promotion ?? ""}`;

      if (normalizeMove(userAnswer) === normalizeMove(puzzle.bestMove)) {
        setGame(nextGame);
        setMessage("Correct");
        setIsSolved(true);
        clearHighlights();
        return true;
      }

      setMessage("Try again");
      clearHighlights();
      return false;
    } catch {
      setMessage("Try again");
      clearHighlights();
      return false;
    }
  }

  function handleSquareClick(square: string) {
    const clickedSquare = square as Square;

    if (isSolved) {
      return;
    }

    if (selectedSquare) {
      if (selectedSquare === clickedSquare) {
        clearHighlights();
        return;
      }

      if (highlightedSquares[clickedSquare]) {
        handleMove(selectedSquare, clickedSquare);
        return;
      }
    }

    const nextHighlights = getSquareHighlights(clickedSquare);

    if (Object.keys(nextHighlights).length === 0) {
      clearHighlights();
      return;
    }

    setSelectedSquare(clickedSquare);
    setHighlightedSquares({
      [clickedSquare]: {
        boxShadow: "inset 0 0 0 4px rgba(250,204,21,0.9)",
      },
      ...nextHighlights,
    });
  }

  function handlePieceClick(_piece: string, square: string) {
    handleSquareClick(square);
  }

  return (
    <section className="mx-auto grid min-h-screen w-full gap-6 bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-50 lg:grid-cols-[minmax(320px,640px)_1fr]">
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Puzzle Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Find the best move from your saved mistake.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onComplete(puzzle.bestMove, puzzle.fen)}
              disabled={!isSolved}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Continue
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {message ? (
            <p
              className={`mb-3 rounded-md px-3 py-2 text-sm font-medium ${
                message === "Correct"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
            >
              {message}
            </p>
          ) : null}

          <Chessboard
            position={game.fen()}
            onPieceClick={handlePieceClick}
            onSquareClick={handleSquareClick}
            onPieceDrop={handleMove}
            boardOrientation="white"
            customBoardStyle={{
              borderRadius: "8px",
            }}
            customDarkSquareStyle={{ backgroundColor: "#557153" }}
            customLightSquareStyle={{ backgroundColor: "#f7e6c4" }}
            customSquareStyles={highlightedSquares}
          />
        </div>
      </div>

      <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-xl font-semibold">Solve the position</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The board is reset to the moment before your old move{" "}
          <strong>{puzzle.userMove}</strong>. Find the engine recommendation to
          continue.
        </p>

        <div className="mt-5 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">Error type</p>
          <p className="mt-1 font-semibold capitalize">{puzzle.type}</p>
        </div>

        <div className="mt-5 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Hint</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Reveal only if you are stuck.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsHintVisible((current) => !current)}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isHintVisible ? "Hide" : "Show"}
            </button>
          </div>

          {isHintVisible ? (
            <p className="mt-3 rounded bg-white px-2 py-1 font-semibold dark:bg-slate-950">
              {puzzle.bestMove || "No hint"}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={resetPuzzle}
          className="mt-5 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
        >
          Reset position
        </button>

        {!isSolved ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Solve correctly to unlock Continue.
          </p>
        ) : null}
      </aside>
    </section>
  );
}

export default PuzzleMode;
