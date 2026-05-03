"use client";

import { useCallback, useEffect, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";

const STORAGE_KEY = "chess-game-fen";
const HISTORY_KEY = "chess-game-history";

type MoveResult = Move | null;
type StoredMove = {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
};

function createGameFromFen(fen?: string) {
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch {
    // If the saved FEN is broken, start a clean game safely.
    return new Chess();
  }
}

function getStoredMoves() {
  try {
    const storedHistory = window.localStorage.getItem(HISTORY_KEY);
    return storedHistory ? (JSON.parse(storedHistory) as StoredMove[]) : [];
  } catch {
    return [];
  }
}

function replayMoves(moves: StoredMove[]) {
  const nextGame = new Chess();

  for (const move of moves) {
    try {
      nextGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? "q",
      });
    } catch {
      return null;
    }
  }

  return nextGame;
}

function serializeMoves(moves: Move[]) {
  return moves.map((move) => ({
    from: move.from,
    to: move.to,
    promotion: ["q", "r", "b", "n"].includes(move.promotion ?? "")
      ? (move.promotion as StoredMove["promotion"])
      : undefined,
  }));
}

function getGameStatus(game: Chess) {
  if (game.isCheckmate()) {
    return `Checkmate. ${game.turn() === "w" ? "Black" : "White"} won.`;
  }

  if (game.isStalemate()) {
    return "Stalemate. Draw.";
  }

  if (game.isDraw()) {
    return "Draw.";
  }

  if (game.isCheck()) {
    return `Check. ${game.turn() === "w" ? "White" : "Black"} to move.`;
  }

  return `${game.turn() === "w" ? "White" : "Black"} to move.`;
}

export function useChessGame() {
  const [game, setGame] = useState(() => createGameFromFen());
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [lastMove, setLastMove] = useState<MoveResult>(null);
  const [history, setHistory] = useState<Move[]>([]);

  useEffect(() => {
    const savedFen = window.localStorage.getItem(STORAGE_KEY);
    const savedMoves = getStoredMoves();
    const replayedGame = replayMoves(savedMoves);
    const restoredGame = replayedGame ?? createGameFromFen(savedFen ?? undefined);

    // A completed game must not be restored — it would re-trigger the save
    // effect on every page visit with a fresh gameId, creating duplicate records.
    if (restoredGame.isGameOver()) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(HISTORY_KEY);
      setIsStorageReady(true);
      return;
    }

    const restoredHistory = replayedGame
      ? restoredGame.history({ verbose: true })
      : [];

    if (!replayedGame) {
      window.localStorage.removeItem(HISTORY_KEY);
    }

    setGame(restoredGame);
    setHistory(restoredHistory);
    setLastMove(restoredHistory.at(-1) ?? null);
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    // FEN stores the full position: pieces, castling rights, turn, and en passant.
    window.localStorage.setItem(STORAGE_KEY, game.fen());
  }, [game, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    // Store moves separately because FEN does not contain move history.
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(serializeMoves(history)),
    );
  }, [history, isStorageReady]);

  const makeMove = useCallback(
    (
      from: Square,
      to: Square,
      promotion: "q" | "r" | "b" | "n" = "q",
      fen = game.fen(),
    ) => {
      try {
        const nextGame = new Chess(fen);

        const move = nextGame.move({
          from,
          to,
          // For the MVP, promote pawns to queens automatically.
          promotion,
        });

        setGame(nextGame);
        setLastMove(move);
        setHistory((currentHistory) => [...currentHistory, move]);
        return move;
      } catch {
        return null;
      }
    },
    [game],
  );

  const resetGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setHistory([]);
    setLastMove(null);
    window.localStorage.setItem(STORAGE_KEY, newGame.fen());
    window.localStorage.removeItem(HISTORY_KEY);
  }, []);

  const undoMove = useCallback(() => {
    if (history.length === 0) {
      return;
    }

    const nextStoredHistory = serializeMoves(history.slice(0, -1));
    const nextGame = replayMoves(nextStoredHistory) ?? new Chess();
    const nextHistory = nextGame.history({ verbose: true });

    setGame(nextGame);
    setHistory(nextHistory);
    setLastMove(nextHistory.at(-1) ?? null);
  }, [history]);

  // Replace the entire game state by replaying a move sequence.
  // Accepts any objects with from/to/promotion (chess.js Move objects work too).
  const loadFromMoves = useCallback(
    (moves: Array<{ from: Square; to: Square; promotion?: string }>) => {
      const serialized: StoredMove[] = moves.map((m) => ({
        from: m.from,
        to: m.to,
        promotion: (["q", "r", "b", "n"] as string[]).includes(m.promotion ?? "")
          ? (m.promotion as StoredMove["promotion"])
          : undefined,
      }));
      const nextGame = replayMoves(serialized) ?? new Chess();
      const nextHistory = nextGame.history({ verbose: true });
      setGame(nextGame);
      setHistory(nextHistory);
      setLastMove(nextHistory.at(-1) ?? null);
    },
    [],
  );

  return {
    fen: game.fen(),
    game,
    history,
    isGameOver: game.isGameOver(),
    lastMove,
    loadFromMoves,
    makeMove,
    resetGame,
    status: getGameStatus(game),
    turn: game.turn(),
    undoMove,
  };
}
