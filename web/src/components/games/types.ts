/**
 * What every little game gets. A game plays one round on its own and calls `onDone` once, with its
 * score (a whole number, higher is better; see shared/minigames.ts for what it counts and the stars).
 * `steps` is filled for the step journey. A game runs inside the game page, which shows its name, the
 * start and the result; the game itself shows only the playing.
 */
export type GameProps = {
  onDone: (score: number) => void;
  steps?: { total: number; today: number };
};
