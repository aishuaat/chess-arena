export function calculatePoints(
  result: "win" | "loss" | "draw",
  blunders: number,
  streak: number,
): number {
  const base = result === "win" ? 10 : result === "draw" ? 5 : 2;
  const blunderBonus = blunders === 0 ? 5 : 0;
  const streakBonus = streak * 2;
  return base + blunderBonus + streakBonus;
}
