/** Pure timeline: pose(i, t) depends only on its inputs. */
export const BOOK_COUNT = 7;
export const START_STAGGER = 0.55;
export const FALL_TIME = 0.55;
export const BOUNCE_TIME = 0.3;
export const BOUNCE_HEIGHT = 0.1;
export const DROP_HEIGHT = 8;
export const HOLD_TIME = 1;
export const TOPPLE_STAGGER = 0.12;
export const TOPPLE_TIME = 0.6;
export const END_PAUSE = 0.4;

const FALL_END = (BOOK_COUNT - 1) * START_STAGGER + FALL_TIME + BOUNCE_TIME;
const TOPPLE_START = FALL_END + HOLD_TIME;
export const TOTAL_TIME =
  TOPPLE_START + (BOOK_COUNT - 1) * TOPPLE_STAGGER + TOPPLE_TIME + END_PAUSE;
/** A time at which the pile is fully landed. */
export const STATIC_TIME = FALL_END;

export interface Rest {
  y: number;
  x: number;
  z: number;
  yaw: number;
}
export interface Pose {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  roll: number;
  scale: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function pose(i: number, rest: Rest, time: number): Pose {
  const t = ((time % TOTAL_TIME) + TOTAL_TIME) % TOTAL_TIME;
  const start = i * START_STAGGER;
  const p: Pose = {
    visible: t >= start,
    x: rest.x,
    y: rest.y,
    z: rest.z,
    yaw: rest.yaw,
    roll: 0,
    scale: 1,
  };
  if (!p.visible) return p;

  const local = t - start;
  if (local < FALL_TIME) {
    const k = local / FALL_TIME;
    p.y = rest.y + DROP_HEIGHT * (1 - k * k);
    const spin = (i % 2 ? -0.8 : 0.8) - rest.yaw;
    p.yaw = rest.yaw + spin * (1 - k);
  } else if (local < FALL_TIME + BOUNCE_TIME) {
    const b = (local - FALL_TIME) / BOUNCE_TIME;
    p.y = rest.y + 4 * BOUNCE_HEIGHT * b * (1 - b);
  }

  // topple: top book first
  const tl = t - (TOPPLE_START + (BOOK_COUNT - 1 - i) * TOPPLE_STAGGER);
  if (tl > 0) {
    const k = clamp01(tl / TOPPLE_TIME);
    const e = k * k;
    const dir = i % 2 ? -1 : 1;
    p.x += dir * 5 * e;
    p.roll = dir * -0.9 * e;
    p.y -= 0.6 * e;
    p.scale = k > 0.85 ? clamp01(1 - (k - 0.85) / 0.15) : 1;
  }
  return p;
}
