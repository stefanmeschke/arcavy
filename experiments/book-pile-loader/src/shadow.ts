import * as THREE from "three";
import type { BookSize } from "./book";

const AREA = 10; // world size of the (square) shadow plane
const SOFT_RES = 512;
const CONTACT_RES = 512;
const SOFT_BLUR = 24; // px
const CONTACT_BLUR = 10; // px
const CONTACT_REACH = 1.2; // height above the ground at which the contact term has faded out
const SOFT_FADE_HEIGHT = 7; // height above the ground at which a falling book no longer casts a visible shadow
const SHADOW_RGB = "20,33,61"; // navy #14213d
const SOFT_OPACITY = 0.2;
const CONTACT_OPACITY = 0.35;

type P2 = [number, number];

const CORNERS = [-1, 1].flatMap((sx) =>
  [0, 1].flatMap((sy) => [-1, 1].map((sz): [number, number, number] => [sx, sy, sz])),
);

interface Layer {
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  res: number;
  blur: number;
}

function cross([ox, oy]: P2, [ax, ay]: P2, [bx, by]: P2) {
  return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

/** Convex hull (monotone chain). Sorts `points` in place. */
function hull(points: P2[]): P2[] {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const build = (reverse: boolean) => {
    const out: P2[] = [];
    for (let k = 0; k < points.length; k++) {
      const q = points[reverse ? points.length - 1 - k : k];
      if (!q) continue;
      for (;;) {
        const a = out[out.length - 2];
        const b = out[out.length - 1];
        if (!a || !b || cross(a, b, q) > 0) break;
        out.pop();
      }
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...build(false), ...build(true)];
}

/**
 * Analytic ground shadow: every frame the books' oriented boxes are projected along the sun
 * direction onto the ground, filled into a small canvas and blurred (canvas shadowBlur, which
 * every browser supports). A tighter, darker layer right under the books adds the contact shadow.
 */
export function createGroundShadow(sunPosition: THREE.Vector3, center: THREE.Vector2) {
  const toSun = sunPosition.clone().normalize();
  const object = new THREE.Group();

  const makeLayer = (res: number, blur: number, opacity: number, order: number): Layer => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = res;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(AREA, AREA).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: texture,
        opacity,
        transparent: true,
        depthWrite: false,
      }),
    );
    mesh.position.set(center.x, 0.002 + order * 0.001, center.y);
    mesh.renderOrder = order;
    object.add(mesh);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    return { ctx, texture, res, blur };
  };
  const soft = makeLayer(SOFT_RES, SOFT_BLUR, SOFT_OPACITY, 1);
  const contact = makeLayer(CONTACT_RES, CONTACT_BLUR, CONTACT_OPACITY, 2);

  const toPixel = (layer: Layer, x: number, z: number): [number, number] => [
    ((x - center.x) / AREA + 0.5) * layer.res,
    ((z - center.y) / AREA + 0.5) * layer.res,
  ];

  function clear(layer: Layer) {
    layer.ctx.clearRect(0, 0, layer.res, layer.res);
  }

  /**
   * Fill a polygon with a blurred edge. Canvas blur only applies to shadows, so the polygon is
   * drawn 2 * res to the left, off canvas, and shadowOffsetX moves its blurred shadow back in place.
   */
  function fill(layer: Layer, polygon: P2[], alpha: number) {
    const { ctx, res } = layer;
    ctx.save();
    ctx.shadowColor = `rgba(${SHADOW_RGB},${alpha})`;
    ctx.shadowBlur = layer.blur;
    ctx.shadowOffsetX = res * 2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    polygon.forEach(([x, z], k) => {
      const [px, py] = toPixel(layer, x, z);
      if (k === 0) ctx.moveTo(px - res * 2, py);
      else ctx.lineTo(px - res * 2, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Ground point below a world point, moved along the sun rays. */
  const project = (v: THREE.Vector3): P2 => [
    v.x - (toSun.x / toSun.y) * Math.max(0, v.y),
    v.z - (toSun.z / toSun.y) * Math.max(0, v.y),
  ];

  const v = new THREE.Vector3();
  const projected: P2[] = [];
  const footprint: P2[] = [];
  const POSE_STRIDE = 7;
  let signature = new Float64Array(0);

  /** True if any book's visibility or pose differs from the last call. */
  function posesChanged(books: { group: THREE.Group }[]) {
    if (signature.length !== books.length * POSE_STRIDE) {
      signature = new Float64Array(books.length * POSE_STRIDE).fill(NaN);
    }
    let changed = false;
    let k = 0;
    const track = (value: number) => {
      if (signature[k] !== value) {
        signature[k] = value;
        changed = true;
      }
      k++;
    };
    for (const { group } of books) {
      track(group.visible ? 1 : 0);
      track(group.position.x);
      track(group.position.y);
      track(group.position.z);
      track(group.rotation.y);
      track(group.rotation.z);
      track(group.scale.x);
    }
    return changed;
  }

  /** Redraws only when a book moved since the last call. */
  function update(books: { group: THREE.Group; size: BookSize }[]) {
    if (!posesChanged(books)) return;

    clear(soft);
    clear(contact);
    let any = false;
    for (const { group, size } of books) {
      if (!group.visible) continue;
      any = true;
      group.updateMatrixWorld();
      projected.length = footprint.length = 0;
      let low = Infinity;
      for (const [sx, sy, sz] of CORNERS) {
        v.set((sx * size.width) / 2, sy * size.thickness, (sz * size.depth) / 2).applyMatrix4(
          group.matrixWorld,
        );
        projected.push(project(v));
        footprint.push([v.x, v.z]);
        low = Math.min(low, v.y);
      }
      // a book that sinks below the ground (end of its exit) must not keep casting a shadow
      const aboveGround = Math.min(1, Math.max(0, 1 + low));
      const heightFade = Math.min(1, Math.max(0, 1 - low / SOFT_FADE_HEIGHT));
      fill(soft, hull(projected), heightFade * aboveGround);
      const closeness = Math.min(1, 1 - low / CONTACT_REACH) * aboveGround;
      if (closeness > 0) fill(contact, hull(footprint), closeness);
    }
    object.visible = any;
    soft.texture.needsUpdate = true;
    contact.texture.needsUpdate = true;
  }

  return { object, update };
}
