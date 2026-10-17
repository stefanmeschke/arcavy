import * as THREE from "three";

const COLORS = [0x8a5a44, 0x5f7a61, 0x4f6d8a, 0xb8894a, 0x7a5c7e, 0xa65d57];
const boxGeo = new THREE.BoxGeometry(1, 1, 1); // unit box, scaled per mesh
const pagesMat = new THREE.MeshLambertMaterial({ color: 0xf1e8d4 });
const colorMats = COLORS.map((c) => new THREE.MeshLambertMaterial({ color: c }));

export interface BookSize {
  width: number;
  depth: number;
  thickness: number;
}

/** Book group with origin at bottom centre; spine on the left. */
export function createBook(size: BookSize, colorIndex: number): THREE.Group {
  const { width, depth, thickness } = size;
  const mat = colorMats[colorIndex % colorMats.length];
  const group = new THREE.Group();

  const add = (
    m: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(boxGeo, m);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  const cover = 0.04;
  const spine = 0.08;
  add(mat, spine, thickness, depth, -width / 2 + spine / 2, thickness / 2, 0); // spine
  add(mat, width, cover, depth, 0, cover / 2, 0); // bottom cover
  add(mat, width, cover, depth, 0, thickness - cover / 2, 0); // top cover
  // pages: recessed 0.04 on the open (right) side, 0.03 in depth
  const pagesW = width - spine - 0.04;
  add(
    pagesMat,
    pagesW,
    thickness - 2 * cover,
    depth - 0.03,
    -width / 2 + spine + pagesW / 2,
    thickness / 2,
    0,
  );
  return group;
}
