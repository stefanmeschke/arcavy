import * as THREE from "three";
import type { BookSize } from "./book";

const AREA = 10; // world size of the (square) shadow plane
const SOFT_RES = 512;
const CONTACT_RES = 512;
const SOFT_BLUR = 24; // px
const CONTACT_BLUR = 10; // px
const CONTACT_REACH = 1.2; // height above the ground at which the contact term has faded out
const SOFT_FADE_HEIGHT = 7; // height above the ground at which a falling book no longer casts a visible shadow
const SHADOW_COLOR = 0x14213d;
const SOFT_OPACITY = 0.2;
const CONTACT_OPACITY = 0.35;

const CORNERS = [-1, 1].flatMap((sx) => [0, 1].flatMap((sy) => [-1, 1].map((sz) => [sx, sy, sz])));

interface Layer {
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh;
  res: number;
  blur: number;
}

function cross(o: number[], a: number[], b: number[]) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** Convex hull (monotone chain). */
function hull(points: number[][]): number[][] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const build = (list: number[][]) => {
    const out: number[][] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...build(p), ...build([...p].reverse())];
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
        color: SHADOW_COLOR,
        opacity,
        transparent: true,
        depthWrite: false,
      }),
    );
    mesh.position.set(center.x, 0.002 + order * 0.001, center.y);
    mesh.renderOrder = order;
    object.add(mesh);
    return { ctx: canvas.getContext("2d") as CanvasRenderingContext2D, texture, mesh, res, blur };
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

  /** Fill a polygon with a blurred edge (drawn off canvas, its shadow lands in place). */
  function fill(layer: Layer, polygon: number[][], alpha: number) {
    const { ctx, res } = layer;
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
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
  const project = (v: THREE.Vector3, lift = 1): number[] => [
    v.x - (toSun.x / toSun.y) * Math.max(0, v.y) * lift,
    v.z - (toSun.z / toSun.y) * Math.max(0, v.y) * lift,
  ];

  function update(groups: { group: THREE.Group; size: BookSize }[]) {
    clear(soft);
    clear(contact);
    const v = new THREE.Vector3();
    let any = false;
    for (const { group, size } of groups) {
      if (!group.visible) continue;
      any = true;
      group.updateMatrixWorld();
      const projected: number[][] = [];
      const footprint: number[][] = [];
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
