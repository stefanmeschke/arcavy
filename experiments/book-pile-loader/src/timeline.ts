/** Pure timeline: pose(i, t) depends only on its inputs. */
export const BOOK_COUNT = 5;
export const START_STAGGER = 0.55;
export const FALL_TIME = 0.55;
export const BOUNCE_TIME = 0.3;
export const BOUNCE_HEIGHT = 0.1;
export const DROP_HEIGHT = 8;
export const HOLD_TIME = 1;
/** Sideways slide over the book below, then a free fall once clear of it. */
export const SLIDE_TIME = 0.3;
export const FALL_OFF_TIME = 0.36;
export const TOPPLE_TIME = SLIDE_TIME + FALL_OFF_TIME;
/** The next book below starts when the one above has finished sliding clear of it. */
export const TOPPLE_STAGGER = SLIDE_TIME;
const SLIDE_ROLL = 0.35; // roll reached at the end of the slide
const FALL_OFF_ROLL = 0.6; // extra roll while falling off
const FALL_OFF_GRAVITY = 7;
const SHRINK_TIME = 0.12; // scale to zero at the very end
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
  /** Book width, for lifting the lowest corner while rolling. */
  width: number;
  /** Sideways travel (along the exit direction) after which the book no longer overlaps the one below. */
  clearance: number;
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

/** Horizontal camera azimuth (shared with main.ts). Exiting books slide parallel to the screen, so they never come closer to the camera. */
export const CAMERA_AZIMUTH_DEG = 21;
const EXIT_Z_PER_X = -Math.tan((CAMERA_AZIMUTH_DEG * Math.PI) / 180);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Books leave alternately to the right and to the left. */
export const exitDirection = (i: number) => (i % 2 ? -1 : 1);

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

  // topple: top book first. While overlapping the book below, the book slides sideways
  // and is lifted so its lowest corner stays on that book's top surface; once clear it falls.
  const tl = t - (TOPPLE_START + (BOOK_COUNT - 1 - i) * TOPPLE_STAGGER);
  if (tl > 0) {
    const dir = exitDirection(i);
    const u = clamp01(tl / SLIDE_TIME);
    const fall = Math.max(0, tl - SLIDE_TIME);
    const speed = (2 * rest.clearance) / SLIDE_TIME; // slide speed at the end of the slide
    const slide = rest.clearance * u * u + speed * fall + 4 * fall * fall;
    const roll = SLIDE_ROLL * u + FALL_OFF_ROLL * (fall / FALL_OFF_TIME) ** 2;
    const lift = (rest.width / 2) * Math.sin(SLIDE_ROLL * u);
    p.x += dir * slide;
    p.z += dir * slide * EXIT_Z_PER_X;
    p.roll = -dir * roll;
    p.y += lift - FALL_OFF_GRAVITY * fall * fall;
    const left = TOPPLE_TIME - tl;
    p.scale = clamp01(left / SHRINK_TIME);
  }
  return p;
}
