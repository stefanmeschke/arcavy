import type { Rest } from "./timeline";
import type { BookSize } from "./book";

const SEED = 7;
/** Bottom to top. */
const BOOKS = [
  { width: 2.4, depth: 1.6, thickness: 0.85, yaw: -0.12 },
  { width: 2.2, depth: 1.5, thickness: 0.5, yaw: 0.25 },
  { width: 2.0, depth: 1.4, thickness: 0.45, yaw: -0.17 },
  { width: 1.8, depth: 1.3, thickness: 0.55, yaw: 0.11 },
  { width: 1.6, depth: 1.2, thickness: 0.4, yaw: -0.2 },
];
export const BOOK_COUNT = BOOKS.length;
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

export const PILE_HEIGHT = BOOKS.reduce((sum, book) => sum + book.thickness, 0);

/** Books leave alternately to the right and to the left. */
export const exitDirection = (i: number) => (i % 2 ? -1 : 1);

export interface PileBook {
  size: BookSize;
  rest: Rest;
}

/** Deterministic pile: alternating angles and casual offsets, bottom to top. */
export function createPile(): PileBook[] {
  const rand = mulberry32(SEED);
  const range = (min: number, max: number) => min + (max - min) * rand();
  const pile: PileBook[] = [];
  let stackY = 0;
  let below: PileBook | undefined;
  for (const [i, { yaw, ...size }] of BOOKS.entries()) {
    const rest: Rest = {
      x: range(-0.1, 0.1),
      z: range(-0.1, 0.1),
      yaw,
      y: stackY,
      width: size.width,
      clearance: 0,
    };
    // slide far enough that neither footprint overlaps the book below (none below the first)
    const reach = reachX(size, yaw);
    const belowReach = below ? reachX(below.size, below.rest.yaw) : 0;
    const belowX = below ? below.rest.x : rest.x;
    rest.clearance = exitDirection(i) * (belowX - rest.x) + reach + belowReach + CLEARANCE_MARGIN;
    below = { size, rest };
    pile.push(below);
    stackY += size.thickness;
  }
  return pile;
}
