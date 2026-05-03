"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { doc, onSnapshot } from "firebase/firestore";
import { db, pushOnlineMove, resignOnlineGame, type OnlineGame, type PlayerProfile } from "@/lib/firebase";

export type RealtimeGameState = {
  game: Chess;
  moves: string[];
  turn: "white" | "black";
  status: OnlineGame["status"];
  result?: OnlineGame["result"];
  resignedBy?: OnlineGame["resignedBy"];
  playerColor: "white" | "black" | null;
  isMyTurn: boolean;
  isSpectator: boolean;
  playersCount: number;
  lastMove: { from: string; to: string } | null;
  whiteProfile: PlayerProfile | null;
  blackProfile: PlayerProfile | null;
};

const INITIAL_STATE: RealtimeGameState = {
  game: new Chess(),
  moves: [],
  turn: "white",
  status: "waiting",
  result: undefined,
  resignedBy: undefined,
  playerColor: null,
  isMyTurn: false,
  isSpectator: false,
  playersCount: 0,
  lastMove: null,
  whiteProfile: null,
  blackProfile: null,
};

export function useRealtimeGame(
  gameId: string | null,
  userId: string | null,
  forceSpectator = false,
) {
  const [state, setState] = useState<RealtimeGameState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!gameId || !db) {
      setIsLoading(false);
      return;
    }
    const ref = doc(db, "games", gameId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setIsLoading(false);
        if (!snap.exists()) {
          setError("Game not found.");
          return;
        }
        const data = snap.data() as OnlineGame;
        const moves: string[] = data.moves ?? [];
        const playersCount = data.players?.length ?? 0;

        const chess = new Chess();
        for (const uci of moves) {
          try {
            chess.move({
              from: uci.slice(0, 2),
              to: uci.slice(2, 4),
              promotion: uci[4] || undefined,
            });
          } catch {
            break;
          }
        }

        const lastUci = moves.at(-1);
        const lastMove = lastUci
          ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) }
          : null;

        const playerColor: "white" | "black" | null = !userId
          ? null
          : data.players[0] === userId
            ? "white"
            : data.players[1] === userId
              ? "black"
              : null;

        const isSpectator =
          forceSpectator ||
          (playerColor === null &&
            (data.status === "playing" || data.status === "finished"));

        const profiles = data.playerProfiles ?? {};
        const whiteProfile = data.players[0] ? (profiles[data.players[0]] ?? null) : null;
        const blackProfile = data.players[1] ? (profiles[data.players[1]] ?? null) : null;

        setState({
          game: chess,
          moves,
          turn: data.turn,
          status: data.status,
          result: data.result,
          resignedBy: data.resignedBy,
          playerColor,
          isMyTurn: playerColor === data.turn && data.status === "playing",
          isSpectator,
          playersCount,
          lastMove,
          whiteProfile,
          blackProfile,
        });
      },
      () => {
        setIsLoading(false);
        setError("Failed to sync game.");
      },
    );

    return () => unsub();
  }, [gameId, userId, forceSpectator]);

  async function sendMove(from: string, to: string, promotion?: string): Promise<boolean> {
    const s = stateRef.current;
    if (!gameId || !s.isMyTurn || s.status !== "playing" || s.isSpectator) return false;
    try {
      const chess = new Chess(s.game.fen());
      const move = chess.move({ from, to, promotion: promotion ?? undefined });
      if (!move) return false;

      const uci = `${from}${to}${promotion ?? ""}`;
      const nextTurn: "white" | "black" = chess.turn() === "w" ? "white" : "black";
      const isOver = chess.isGameOver();
      let result: OnlineGame["result"];
      if (isOver) {
        result = chess.isCheckmate()
          ? chess.turn() === "w" ? "black" : "white"
          : "draw";
      }
      await pushOnlineMove(gameId, uci, s.turn, nextTurn, isOver, result);
      return true;
    } catch {
      return false;
    }
  }

  async function resign(): Promise<void> {
    const s = stateRef.current;
    if (!gameId || !s.playerColor || s.status !== "playing" || s.isSpectator) return;
    await resignOnlineGame(gameId, s.playerColor);
  }

  return { state, isLoading, error, sendMove, resign };
}
