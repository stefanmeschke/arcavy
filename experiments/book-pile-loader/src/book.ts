import * as THREE from "three";

/** Cover colours, bottom to top. */
export const COLORS = [0x14213d, 0xfca311, 0xe5e5e5, 0xc9780a, 0xfdd28a];
const RIBBON_BOOK = 0; // long ribbon bookmark hanging off the front
const RIBBON_COLOR = 0xfca311;
const TAB_BOOK = 3; // short notched tab on the page face
const TAB_COLOR = 0x14213d;

const COVER = 0.06; // cover shell thickness
const PAGE_INSET_Z = 0.05; // pages are recessed from the front and back faces
const PAGE_INSET_X = 0.05; // ... and from the open side
const CURVE_SEGMENTS = 24;

const lambert = (color: THREE.ColorRepresentation) => new THREE.MeshLambertMaterial({ color });
const pageFaceMat = lambert(0xffffff);
const pageSideMat = lambert(0xfffaf0);

export interface BookSize {
  width: number;
  depth: number;
  thickness: number;
}

/** Extrude an XY shape along z, centred on z = 0. */
function extrude(shape: THREE.Shape, length: number): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS,
  });
  geometry.translate(0, 0, -length / 2);
  return geometry;
}

/** The "C" cover: top cover, rounded spine, bottom cover, as one thin shell. */
function coverShape(width: number, thickness: number): THREE.Shape {
  const r = thickness / 2;
  const cx = -width / 2 + r;
  const right = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(right, thickness);
  shape.lineTo(cx, thickness);
  shape.absarc(cx, r, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  shape.lineTo(right, 0);
  shape.lineTo(right, COVER);
  shape.lineTo(cx, COVER);
  shape.absarc(cx, r, r - COVER, (3 * Math.PI) / 2, Math.PI / 2, true);
  shape.lineTo(right, thickness - COVER);
  shape.closePath();
  return shape;
}

/** The "D" page block: half disc against the spine plus a rectangle. */
function pagesShape(width: number, thickness: number): THREE.Shape {
  const r = thickness / 2;
  const cx = -width / 2 + r;
  const right = width / 2 - PAGE_INSET_X;
  const pr = r - COVER - 0.004;
  const shape = new THREE.Shape();
  shape.moveTo(cx, r + pr);
  shape.lineTo(right, r + pr);
  shape.lineTo(right, r - pr);
  shape.lineTo(cx, r - pr);
  shape.absarc(cx, r, pr, (3 * Math.PI) / 2, Math.PI / 2, true);
  return shape;
}

const smoothstep = THREE.MathUtils.smoothstep;

/**
 * A ribbon that lies on the page face, curves outward over the bottom cover lip
 * (clear of it by at least RIBBON_CLEARANCE), hangs in front of the cover and rests on the ground.
 * Points are (y, z) in the book's local space.
 */
export const RIBBON_CLEARANCE = 0.01;
export function ribbonPath(size: BookSize): [number, number][] {
  const front = size.depth / 2; // front edge of the covers
  const face = front - PAGE_INSET_Z + 0.008; // lying on the recessed page face
  return [
    [size.thickness - COVER - 0.01, face],
    [COVER + 0.3, face],
    [COVER + 0.14, face + 0.004],
    [COVER + 0.07, front - 0.025],
    [COVER + 0.045, front + 0.012],
    [COVER + 0.02, front + 0.045],
    [0.04, front + 0.06],
    [0.016, front + 0.1],
    [0.014, front + 0.25],
    [0.014, front + 0.45],
    [0.014, front + 0.7],
  ];
}

function ribbonGeometry(size: BookSize): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    ribbonPath(size).map(([y, z]) => new THREE.Vector3(0, y, z)),
    false,
    "centripetal",
  );
  const rows = 80;
  const baseWidth = 0.15;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const k = row / rows;
    const point = curve.getPointAt(k);
    const width = baseWidth * (1 + 0.5 * smoothstep(k, 0.7, 1));
    // gentle sideways wave, growing towards the free end
    const sway = 0.04 * Math.sin(k * 14) * smoothstep(k, 0.3, 1);
    positions.push(sway - width / 2, point.y, point.z, sway + width / 2, point.y, point.z);
    if (row < rows) {
      const i = row * 2;
      indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A short bookmark tab with a V-notch, lying on the page face. */
function tabGeometry(): THREE.ShapeGeometry {
  const w = 0.12;
  const h = 0.24;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, -h);
  shape.lineTo(0, -h + 0.06);
  shape.lineTo(-w / 2, -h);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Book group with origin at bottom centre; spine at -x, open side at +x,
 * front page face at +z.
 */
export function createBook(size: BookSize, colorIndex: number): THREE.Group {
  const { width, depth, thickness } = size;
  const i = colorIndex % COLORS.length;
  const group = new THREE.Group();

  group.add(mesh(extrude(coverShape(width, thickness), depth), lambert(COLORS[i])));

  // caps are the white page faces, sides the pale blue open side
  group.add(
    mesh(extrude(pagesShape(width, thickness), depth - 2 * PAGE_INSET_Z), [
      pageFaceMat,
      pageSideMat,
    ]),
  );

  if (i === RIBBON_BOOK) {
    const ribbonMat = lambert(RIBBON_COLOR);
    ribbonMat.side = THREE.DoubleSide;
    ribbonMat.polygonOffset = true;
    ribbonMat.polygonOffsetFactor = -2;
    ribbonMat.polygonOffsetUnits = -2;
    const ribbon = mesh(ribbonGeometry(size), ribbonMat);
    ribbon.castShadow = false;
    ribbon.receiveShadow = false;
    ribbon.position.x = -width / 2 + thickness / 2 + width * 0.22;
    group.add(ribbon);
  }
  if (i === TAB_BOOK) {
    const tabMat = lambert(TAB_COLOR);
    tabMat.polygonOffset = true;
    tabMat.polygonOffsetFactor = -2;
    tabMat.polygonOffsetUnits = -2;
    const tab = mesh(tabGeometry(), tabMat);
    tab.castShadow = false;
    tab.position.set(width * 0.12, thickness - COVER - 0.004, depth / 2 - PAGE_INSET_Z + 0.006);
    group.add(tab);
  }
  return group;
}
