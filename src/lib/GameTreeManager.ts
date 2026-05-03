import { Chess } from "chess.js";

export type TreeNode = {
  id: string;
  fen: string;
  san: string | null;
  uci: string | null;
  eval: number | null;
  parentId: string | null;
  children: string[];
  depth: number;
};

export type GameTree = {
  nodes: Record<string, TreeNode>;
  rootId: string;
};

export const INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function createTree(fen = INITIAL_FEN): GameTree {
  const root: TreeNode = {
    id: "root",
    fen,
    san: null,
    uci: null,
    eval: null,
    parentId: null,
    children: [],
    depth: 0,
  };
  return { nodes: { root }, rootId: "root" };
}

export function addNode(
  tree: GameTree,
  parentId: string,
  fen: string,
  san: string,
  uci: string | null = null,
  evalScore: number | null = null,
): { tree: GameTree; nodeId: string } {
  const parent = tree.nodes[parentId];
  if (!parent) return { tree, nodeId: parentId };

  // Deduplicate: reuse existing child with same SAN
  const existing = parent.children.find((id) => tree.nodes[id]?.san === san);
  if (existing) return { tree, nodeId: existing };

  const nodeId = `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const node: TreeNode = {
    id: nodeId,
    fen,
    san,
    uci,
    eval: evalScore,
    parentId,
    children: [],
    depth: parent.depth + 1,
  };

  return {
    tree: {
      ...tree,
      nodes: {
        ...tree.nodes,
        [parentId]: { ...parent, children: [...parent.children, nodeId] },
        [nodeId]: node,
      },
    },
    nodeId,
  };
}

export function getNode(tree: GameTree, id: string): TreeNode | undefined {
  return tree.nodes[id];
}

export function getPathFromRoot(tree: GameTree, nodeId: string): TreeNode[] {
  const path: TreeNode[] = [];
  let current: TreeNode | undefined = tree.nodes[nodeId];
  while (current) {
    path.unshift(current);
    if (!current.parentId) break;
    current = tree.nodes[current.parentId];
  }
  return path;
}

export function getMainLine(tree: GameTree): TreeNode[] {
  const line: TreeNode[] = [];
  let current: TreeNode | undefined = tree.nodes[tree.rootId];
  while (current) {
    line.push(current);
    if (current.children.length === 0) break;
    current = tree.nodes[current.children[0]!];
  }
  return line;
}

export function getBranchChildren(tree: GameTree, nodeId: string): TreeNode[] {
  const node = tree.nodes[nodeId];
  if (!node) return [];
  // All children that are NOT the first child (the first child is the main line)
  return node.children.slice(1).map((id) => tree.nodes[id]).filter((n): n is TreeNode => !!n);
}

export function hasBranches(tree: GameTree, nodeId: string): boolean {
  return (tree.nodes[nodeId]?.children.length ?? 0) > 1;
}

export function uciToSan(fen: string, uci: string): string | null {
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

export function applyUci(fen: string, uci: string): string | null {
  try {
    const game = new Chess(fen);
    game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: (uci[4] as "q" | "r" | "b" | "n") || undefined,
    });
    return game.fen();
  } catch {
    return null;
  }
}

// Returns move number and color for a given tree depth
export function moveLabel(depth: number): { num: number; color: "w" | "b" } {
  return {
    num: Math.ceil(depth / 2),
    color: depth % 2 === 1 ? "w" : "b",
  };
}
