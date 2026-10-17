import { BOOK_COUNT, exitDirection, type Rest } from "./timeline";
import type { BookSize } from "./book";

const SEED = 7;
const WIDTHS = [2.4, 2.2, 2.0, 1.8, 1.6];
const DEPTHS = [1.6, 1.5, 1.4, 1.3, 1.2];
const THICKNESSES = [0.85, 0.5, 0.45, 0.55, 0.4];
const YAWS = [-0.12, 0.25, -0.17, 0.11, -0.2];
const CLEARANCE_MARGIN = 0.15;

// Deterministic RNG
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Half extent of a yawed book along x. */
const reachX = (size: BookSize, yaw: number) =>
  (size.width / 2) * Math.abs(Math.cos(yaw)) + (size.depth / 2) * Math.abs(Math.sin(yaw));

export const PILE_SIZES: BookSize[] = WIDTHS.map((width, i) => ({
  width,
  depth: DEPTHS[i],
  thickness: THICKNESSES[i],
}));
export const PILE_HEIGHT = THICKNESSES.reduce((sum, t) => sum + t, 0);

/** Deterministic pile: alternating angles and casual offsets, bottom to top. */
export function createPile(): Rest[] {
  const rand = mulberry32(SEED);
  const range = (min: number, max: number) => min + (max - min) * rand();
  const rests: Rest[] = [];
  let stackY = 0;
  for (let i = 0; i < BOOK_COUNT; i++) {
    const rest = {
      x: range(-0.1, 0.1),
      z: range(-0.1, 0.1),
      yaw: YAWS[i],
      y: stackY,
      width: WIDTHS[i],
      clearance: 0,
    };
    // slide far enough that neither footprint overlaps the book below (none below the first)
    const reach = reachX(PILE_SIZES[i], rest.yaw);
    const below = i > 0 ? rests[i - 1] : undefined;
    const belowReach = below ? reachX(PILE_SIZES[i - 1], below.yaw) : 0;
    const belowX = below ? below.x : rest.x;
    rest.clearance = exitDirection(i) * (belowX - rest.x) + reach + belowReach + CLEARANCE_MARGIN;
    rests.push(rest);
    stackY += THICKNESSES[i];
  }
  return rests;
}
