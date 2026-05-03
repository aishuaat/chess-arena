"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useRealtimeGame } from "@/hooks/useRealtimeGame";
import { useChatMessages } from "@/hooks/useChatMessages";
import { joinOnlineGame, type PlayerProfile } from "@/lib/firebase";
import type { User } from "firebase/auth";

type Props = { gameId: string; user: User; forceSpectator?: boolean };
type Tab = "chat" | "moves";

const LAST_MOVE_STYLE: CSSProperties = { background: "rgba(99,102,241,0.30)" };

export function GameRoom({ gameId, user, forceSpectator = false }: Props) {
  const { state, isLoading, error, sendMove, resign } = useRealtimeGame(gameId, user.uid, forceSpectator);
  const { messages, send: sendMessage } = useChatMessages(gameId);

  // Join flow
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // Board
  const [isSending, setIsSending] = useState(false);

  // Share link copy
  const [copied, setCopied] = useState(false);

  // Side panel
  const [tab, setTab] = useState<Tab>("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resign
  const [resignConfirm, setResignConfirm] = useState(false);
  const [resigning, setResigning] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/${gameId}`
      : `/play/${gameId}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleJoin() {
    setJoining(true);
    setJoinError(null);
    try {
      await joinOnlineGame(gameId, user.uid, {
        name: user.displayName ?? user.email ?? "Player",
        ...(user.photoURL ? { avatar: user.photoURL } : {}),
      });
      setJoined(true);
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : "Failed to join.");
    } finally {
      setJoining(false);
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function onPieceDrop(sourceSquare: string, targetSquare: string, piece: string): boolean {
    if (!state.isMyTurn || state.status !== "playing" || isSending || state.isSpectator) return false;

    const isPromo =
      piece[1]?.toLowerCase() === "p" &&
      ((state.playerColor === "white" && targetSquare[1] === "8") ||
        (state.playerColor === "black" && targetSquare[1] === "1"));
    const promotion = isPromo ? "q" : undefined;

    // Local validation — returns false immediately for snap-back
    const testChess = new Chess(state.game.fen());
    const valid = testChess.move({ from: sourceSquare, to: targetSquare, promotion });
    if (!valid) return false;

    setIsSending(true);
    void sendMove(sourceSquare, targetSquare, promotion).finally(() => setIsSending(false));
    return true;
  }

  async function handleSendChat(e: FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatSending(true);
    try {
      await sendMessage(
        user.uid,
        user.displayName ?? user.email ?? "Player",
        chatInput,
      );
      setChatInput("");
    } finally {
      setChatSending(false);
    }
  }

  async function handleResign() {
    setResigning(true);
    try {
      await resign();
      setResignConfirm(false);
    } finally {
      setResigning(false);
    }
  }

  // ── Screens ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 dark:bg-[#0B0F19]">
        <p className="text-rose-400">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 dark:bg-[#0B0F19]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // Creator: waiting for opponent
  if (!forceSpectator && state.status === "waiting" && state.playerColor === "white") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4 dark:bg-[#0B0F19]">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-white/5 dark:bg-[#111827]">
          <div className="mb-6 text-center">
            <span className="text-4xl">♟</span>
            <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              Waiting for opponent…
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Share the link below to start.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <span className="flex-1 truncate font-mono text-xs text-slate-600 dark:text-slate-300">
              {shareUrl}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-600 active:scale-95"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            <p className="text-xs text-slate-500">You are playing as White</p>
          </div>
        </div>
      </div>
    );
  }

  // Visitor: join screen — only if game still has room for a second player and not watching
  if (!forceSpectator && state.status === "waiting" && state.playerColor === null && state.playersCount < 2 && !joined) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4 dark:bg-[#0B0F19]">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-white/5 dark:bg-[#111827]">
          <div className="mb-6 text-center">
            <span className="text-4xl">♟</span>
            <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              Join Game
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;ve been invited to play chess.
            </p>
          </div>

          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {joining ? "Joining…" : "Join as Black"}
          </button>
          {joinError && (
            <p className="mt-3 text-center text-xs text-rose-400">{joinError}</p>
          )}
        </div>
      </div>
    );
  }

  // Joining: brief transition state between API success and snapshot update
  if (!forceSpectator && joined && state.status === "waiting") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 dark:bg-[#0B0F19]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Starting game…</p>
        </div>
      </div>
    );
  }

  // ── Game screen ──────────────────────────────────────────────────────────────

  const isFinished = state.status === "finished";
  const canDrag = state.isMyTurn && state.status === "playing" && !isSending && !state.isSpectator;

  const turnLabel = isFinished
    ? state.resignedBy
      ? `${state.resignedBy === "white" ? "White" : "Black"} resigned`
      : state.result === "draw"
        ? "Draw"
        : `${state.result === "white" ? "White" : "Black"} wins`
    : state.isSpectator
      ? `${state.turn === "white" ? "White" : "Black"} to move`
      : state.isMyTurn
        ? "Your turn"
        : "Opponent's turn";

  const turnColor = isFinished
    ? "text-slate-400"
    : state.isSpectator
      ? "text-slate-400"
      : state.isMyTurn
        ? "text-emerald-400"
        : "text-amber-400";

  const highlightSquares: Record<string, CSSProperties> = state.lastMove
    ? {
        [state.lastMove.from]: LAST_MOVE_STYLE,
        [state.lastMove.to]: LAST_MOVE_STYLE,
      }
    : {};

  const moveHistory = state.game.history();
  const movePairs = Array.from(
    { length: Math.ceil(moveHistory.length / 2) },
    (_, i) => ({
      n: i + 1,
      white: moveHistory[i * 2] ?? "",
      black: moveHistory[i * 2 + 1] ?? "",
    }),
  );

  const gameOverMessage = isFinished
    ? state.isSpectator
      ? state.resignedBy
        ? `${state.resignedBy === "white" ? "White" : "Black"} resigned.`
        : state.result === "draw"
          ? "The game ended in a draw."
          : `${state.result === "white" ? "White" : "Black"} wins!`
      : state.resignedBy
        ? state.resignedBy === state.playerColor
          ? "You resigned."
          : "Opponent resigned. You win! 🎉"
        : state.result === "draw"
          ? "It's a draw!"
          : state.result === state.playerColor
            ? "You won! 🎉"
            : "You lost. Better luck next time."
    : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19]">
      {/* ── Header ── */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#111827]">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Online Game
            </p>
            <p className={`mt-0.5 text-sm font-bold ${turnColor}`}>{turnLabel}</p>
          </div>

          <div className="flex items-center gap-3">
            {state.isSpectator ? (
              <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 dark:border-violet-500/20 dark:bg-violet-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                  Watching game
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  You
                </span>
                <span className="capitalize text-sm font-bold text-slate-900 dark:text-white">
                  {state.playerColor ?? "—"}
                </span>
              </div>
            )}

            {state.status === "playing" && state.playerColor !== null && (
              <button
                onClick={() => setResignConfirm(true)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-500 transition-all hover:bg-rose-500 hover:text-white dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white"
              >
                Resign
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Resign confirmation bar ── */}
      {resignConfirm && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <p className="text-sm text-rose-600 dark:text-rose-400">
              Are you sure you want to resign?
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={() => setResignConfirm(false)}
                className="rounded-lg px-4 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleResign}
                disabled={resigning}
                className="rounded-lg bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {resigning ? "Resigning…" : "Confirm Resign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="mx-auto grid max-w-5xl gap-6 p-4 lg:grid-cols-[minmax(300px,480px)_1fr]">
        {/* Board column */}
        <div className="flex flex-col gap-4">
          {/* Player vs Player banner */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#111827] px-4 py-3">
            <PlayerAvatar
              profile={state.whiteProfile}
              colorLabel="White"
              isActive={state.turn === "white" && state.status === "playing"}
              align="left"
            />
            <span className="shrink-0 text-xs font-bold text-slate-500">vs</span>
            <PlayerAvatar
              profile={state.blackProfile}
              colorLabel="Black"
              isActive={state.turn === "black" && state.status === "playing"}
              align="right"
            />
          </div>

          <Chessboard
            position={state.game.fen()}
            boardOrientation={state.playerColor ?? "white"}
            arePiecesDraggable={canDrag}
            onPieceDrop={onPieceDrop}
            customSquareStyles={highlightSquares}
            customBoardStyle={{
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            }}
          />

          {gameOverMessage && (
            <div className="rounded-xl border border-white/5 bg-[#111827] px-5 py-4 text-center">
              <p className="text-base font-bold text-white">{gameOverMessage}</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex h-[480px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/5 dark:bg-[#111827]">
          {/* Tabs */}
          <div className="flex shrink-0 border-b border-slate-200 dark:border-white/5">
            {(["chat", "moves"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  tab === t
                    ? "border-b-2 border-indigo-500 text-indigo-500"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Chat tab */}
          {tab === "chat" && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-500">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.uid === user.uid ? "items-end" : "items-start"
                        }`}
                      >
                        <span className="text-[10px] text-slate-500">{msg.displayName}</span>
                        <span
                          className={`mt-0.5 max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                            msg.uid === user.uid
                              ? "bg-indigo-500 text-white"
                              : "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
                          }`}
                        >
                          {msg.text}
                        </span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSendChat}
                className="shrink-0 border-t border-slate-200 p-3 dark:border-white/5"
              >
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message…"
                    disabled={chatSending}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatSending}
                    className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Moves tab */}
          {tab === "moves" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {movePairs.length === 0 ? (
                <p className="text-center text-xs text-slate-500">No moves yet.</p>
              ) : (
                <div className="space-y-0.5">
                  {movePairs.map(({ n, white, black }) => (
                    <div key={n} className="flex items-baseline gap-2 rounded px-1 py-0.5 text-sm">
                      <span className="w-6 shrink-0 text-[11px] text-slate-400">{n}.</span>
                      <span className="w-14 font-mono text-slate-900 dark:text-white">{white}</span>
                      <span className="w-14 font-mono text-slate-500 dark:text-slate-400">{black}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerAvatar({
  profile,
  colorLabel,
  isActive,
  align,
}: {
  profile: PlayerProfile | null;
  colorLabel: "White" | "Black";
  isActive: boolean;
  align: "left" | "right";
}) {
  const name = profile?.name ?? colorLabel;
  const initial = name.charAt(0).toUpperCase();
  const ring = isActive
    ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#111827]"
    : "";

  return (
    <div
      className={`flex items-center gap-2.5 ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div className={`relative h-9 w-9 shrink-0 rounded-full ${ring}`}>
        {profile?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar}
            alt={name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center rounded-full text-sm font-bold text-white ${
              colorLabel === "White"
                ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                : "bg-gradient-to-br from-slate-600 to-slate-800"
            }`}
          >
            {initial}
          </div>
        )}
        {isActive && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111827] bg-emerald-400" />
        )}
      </div>

      {/* Name + color */}
      <div className={align === "right" ? "text-right" : ""}>
        <p
          className={`max-w-[100px] truncate text-sm font-semibold ${
            isActive ? "text-white" : "text-slate-400"
          }`}
        >
          {name}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">
          {colorLabel}
        </p>
      </div>
    </div>
  );
}

export default GameRoom;
