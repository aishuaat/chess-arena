import { Chess, type Color } from "chess.js";

const STOCKFISH_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js";

// ── Cache ──────────────────────────────────────────────────────────────────────

const fenCache = new Map<string, TopMove[]>();
const CACHE_MAX = 200;

function cacheSet(fen: string, moves: TopMove[]): void {
  if (fenCache.size >= CACHE_MAX) {
    const oldest = fenCache.keys().next().value;
    if (oldest !== undefined) fenCache.delete(oldest);
  }
  fenCache.set(fen, moves);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PositionAnalysis = {
  bestMove: string;
  evaluation: number;
};

export type TopMove = {
  uci: string;
  san: string | null;
  eval: number;
};

export type GetTopMovesOptions = {
  movetime?: number;
  onPartial?: (moves: TopMove[]) => void;
};

// ── Engine state ──────────────────────────────────────────────────────────────

let worker: Worker | null = null;
let engineQueue: Promise<unknown> = Promise.resolve();

let pendingAnalysis: {
  resolve: (a: PositionAnalysis) => void;
  reject: (e: Error) => void;
  timeoutId: number;
  lastEvaluation: number;
} | null = null;

let pendingTopMoves: {
  fen: string;
  count: number;
  resolve: (moves: TopMove[]) => void;
  reject: (e: Error) => void;
  timeoutId: number;
  collected: Map<number, { uci: string; rawEval: number }>;
  onPartial?: (moves: TopMove[]) => void;
  lastPartialSize: number;
} | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMovesFromCollected(
  fen: string,
  collected: Map<number, { uci: string; rawEval: number }>,
): TopMove[] {
  return Array.from(collected.entries())
    .sort(([a], [b]) => a - b)
    .map(([, { uci, rawEval }]) => ({
      uci,
      san: convertUciToSan(fen, uci),
      eval: normalizeEvalForWhite(fen, rawEval),
    }));
}

function parseEvaluation(message: string) {
  const cpMatch = message.match(/\bscore cp (-?\d+)/);
  if (cpMatch) return Number(cpMatch[1]) / 100;
  const mateMatch = message.match(/\bscore mate (-?\d+)/);
  if (mateMatch) return Number(mateMatch[1]) > 0 ? 100 : -100;
  return null;
}

function getPieceValue(piece: string) {
  return ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as Record<string, number>)[piece] ?? 0;
}

function getFallbackEvaluation(game: Chess) {
  return game.board().flat().reduce((score, piece) => {
    if (!piece) return score;
    const value = getPieceValue(piece.type);
    return piece.color === "w" ? score + value : score - value;
  }, 0);
}

function getFallbackAnalysis(fen: string): PositionAnalysis {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return { bestMove: "", evaluation: getFallbackEvaluation(game) };
  const best = [...moves].sort(
    (a, b) => (b.captured ? getPieceValue(b.captured) : 0) - (a.captured ? getPieceValue(a.captured) : 0),
  )[0]!;
  return {
    bestMove: `${best.from}${best.to}${best.promotion ?? ""}`,
    evaluation: getFallbackEvaluation(game),
  };
}

function getFallbackTopMoves(fen: string, count: number): TopMove[] {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return [];
  const base = getFallbackEvaluation(game);
  return [...moves]
    .sort((a, b) => (b.captured ? getPieceValue(b.captured) : 0) - (a.captured ? getPieceValue(a.captured) : 0))
    .slice(0, count)
    .map((m, i) => ({
      uci: `${m.from}${m.to}${m.promotion ?? ""}`,
      san: m.san,
      eval: base - i * 0.15,
    }));
}

function normalizeEvalForWhite(fen: string, evaluation: number) {
  const sideToMove = fen.split(" ")[1] as Color | undefined;
  return sideToMove === "b" ? -evaluation : evaluation;
}

function convertUciToSan(fen: string, uci: string): string | null {
  try {
    const game = new Chess(fen);
    const move = game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: (uci[4] as "q" | "r" | "b" | "n") || undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────

function createStockfishWorker() {
  if (worker) return worker;

  const workerSource = `importScripts("${STOCKFISH_CDN_URL}");`;
  const workerUrl = URL.createObjectURL(
    new Blob([workerSource], { type: "text/javascript" }),
  );
  worker = new Worker(workerUrl);
  URL.revokeObjectURL(workerUrl);

  worker.onmessage = (event: MessageEvent<string>) => {
    const msg = event.data;

    // ── MultiPV handler ──────────────────────────────────────────────────
    if (pendingTopMoves) {
      const infoMatch = msg.match(
        /\bmultipv (\d+)\b.*?\bscore (cp (-?\d+)|mate (-?\d+))\b.*?\bpv ([a-h][1-8][a-h][1-8][qrbn]?)\b/,
      );
      if (infoMatch) {
        const idx = parseInt(infoMatch[1]!, 10);
        const cp = infoMatch[3];
        const mate = infoMatch[4];
        const uci = infoMatch[5]!;
        const rawEval = cp
          ? parseInt(cp, 10) / 100
          : parseInt(mate ?? "1", 10) > 0
            ? 100
            : -100;
        pendingTopMoves.collected.set(idx, { uci, rawEval });

        // Fire partial when we get a new rank for the first time
        if (
          pendingTopMoves.onPartial &&
          pendingTopMoves.collected.size > pendingTopMoves.lastPartialSize
        ) {
          pendingTopMoves.lastPartialSize = pendingTopMoves.collected.size;
          pendingTopMoves.onPartial(
            buildMovesFromCollected(pendingTopMoves.fen, pendingTopMoves.collected),
          );
        }
      }

      if (msg.startsWith("bestmove")) {
        const { fen, collected, resolve, timeoutId } = pendingTopMoves;
        window.clearTimeout(timeoutId);
        pendingTopMoves = null;

        const moves = buildMovesFromCollected(fen, collected);
        cacheSet(fen, moves);
        worker?.postMessage("setoption name MultiPV value 1");
        resolve(moves);
      }
      return;
    }

    // ── Single-analysis handler ──────────────────────────────────────────
    if (!pendingAnalysis) return;

    const evaluation = parseEvaluation(msg);
    if (evaluation !== null) pendingAnalysis.lastEvaluation = evaluation;

    if (!msg.startsWith("bestmove")) return;

    const [, bestMove] = msg.split(" ");
    window.clearTimeout(pendingAnalysis.timeoutId);

    if (!bestMove || bestMove === "(none)") {
      pendingAnalysis.reject(new Error("Stockfish did not find a move."));
    } else {
      pendingAnalysis.resolve({
        bestMove,
        evaluation: pendingAnalysis.lastEvaluation,
      });
    }
    pendingAnalysis = null;
  };

  worker.onerror = () => {
    if (pendingAnalysis) {
      window.clearTimeout(pendingAnalysis.timeoutId);
      pendingAnalysis.reject(new Error("Stockfish worker failed."));
      pendingAnalysis = null;
    }
    if (pendingTopMoves) {
      window.clearTimeout(pendingTopMoves.timeoutId);
      pendingTopMoves.reject(new Error("Stockfish worker failed."));
      pendingTopMoves = null;
    }
  };

  worker.postMessage("uci");
  worker.postMessage("isready");
  return worker;
}

// ── Queue runner ─────────────────────────────────────────────────────────────

function runQueued<T>(task: () => Promise<T>) {
  const next = engineQueue.then(task, task);
  engineQueue = next.catch(() => undefined);
  return next;
}

// ── Core requests ─────────────────────────────────────────────────────────────

function getStockfishAnalysis(fen: string, depth = 10) {
  const stockfish = createStockfishWorker();

  if (pendingAnalysis) {
    pendingAnalysis.reject(new Error("Superseded."));
    pendingAnalysis = null;
  }

  return new Promise<PositionAnalysis>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      pendingAnalysis = null;
      reject(new Error("Stockfish timed out."));
    }, 4000);

    pendingAnalysis = {
      resolve: (a) => resolve({ ...a, evaluation: normalizeEvalForWhite(fen, a.evaluation) }),
      reject,
      timeoutId,
      lastEvaluation: getFallbackEvaluation(new Chess(fen)),
    };

    stockfish.postMessage("stop");
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go depth ${depth}`);
  });
}

function getTopMovesAnalysis(
  fen: string,
  count: number,
  movetime: number,
  onPartial?: (moves: TopMove[]) => void,
) {
  const stockfish = createStockfishWorker();

  if (pendingAnalysis) {
    pendingAnalysis.reject(new Error("Superseded by top-moves."));
    pendingAnalysis = null;
  }
  if (pendingTopMoves) {
    pendingTopMoves.reject(new Error("Superseded by newer top-moves."));
    pendingTopMoves = null;
  }

  return new Promise<TopMove[]>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      if (!pendingTopMoves) return;
      const { fen: f, collected } = pendingTopMoves;
      pendingTopMoves = null;
      worker?.postMessage("setoption name MultiPV value 1");
      const partial = buildMovesFromCollected(f, collected);
      if (partial.length > 0) {
        cacheSet(f, partial);
        resolve(partial);
      } else {
        reject(new Error("Stockfish top-moves timed out."));
      }
    }, movetime + 500);

    pendingTopMoves = {
      fen,
      count,
      resolve,
      reject,
      timeoutId,
      collected: new Map(),
      onPartial,
      lastPartialSize: 0,
    };

    stockfish.postMessage("stop");
    stockfish.postMessage(`setoption name MultiPV value ${count}`);
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go movetime ${movetime}`);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzePosition(fen: string, depth = 10) {
  return runQueued(async () => {
    try {
      return await getStockfishAnalysis(fen, depth);
    } catch {
      return getFallbackAnalysis(fen);
    }
  });
}

export async function getBestMove(fen: string, depth = 10) {
  const analysis = await analyzePosition(fen, depth);
  return analysis.bestMove;
}

// Bypasses the queue — cancels any in-progress top-moves immediately.
// Returns cached result synchronously (via onPartial) when available.
export async function getTopMoves(
  fen: string,
  count = 3,
  options: GetTopMovesOptions = {},
): Promise<TopMove[]> {
  const { movetime = 300, onPartial } = options;

  const cached = fenCache.get(fen);
  if (cached) {
    onPartial?.(cached);
    return cached;
  }

  try {
    return await getTopMovesAnalysis(fen, count, movetime, onPartial);
  } catch {
    const fallback = getFallbackTopMoves(fen, count);
    onPartial?.(fallback);
    return fallback;
  }
}

// Warms the cache for a position in the background.
// No-ops if the engine is already busy or the position is cached.
export function preloadPosition(fen: string, count = 3): void {
  if (fenCache.has(fen) || pendingTopMoves !== null) return;
  void getTopMoves(fen, count, { movetime: 300 });
}

export function clearAnalysisCache(): void {
  fenCache.clear();
}
