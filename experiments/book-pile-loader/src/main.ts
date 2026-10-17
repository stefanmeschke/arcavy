import * as THREE from "three";
import { createBook } from "./book";
import { BOOK_COUNT, STATIC_TIME, pose, type Rest } from "./timeline";

const SEED = 7;
const container = document.getElementById("scene") as HTMLElement;

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
const rand = mulberry32(SEED);
const range = (min: number, max: number) => min + (max - min) * rand();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff6e8, 0xc9bda8, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(-4, 9, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.radius = 6;
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.ShadowMaterial({ opacity: 0.18 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
camera.position.set(6, 6.5, 12);
camera.lookAt(0, 1.1, 0);

// Build the pile
const books: { group: THREE.Group; rest: Rest }[] = [];
let stackY = 0;
for (let i = 0; i < BOOK_COUNT; i++) {
  const size = { width: range(1.6, 2.0), depth: range(1.1, 1.4), thickness: range(0.22, 0.38) };
  const rest: Rest = {
    x: range(-0.12, 0.12),
    z: range(-0.1, 0.1),
    yaw: range(-0.3, 0.3),
    y: stackY,
  };
  const group = createBook(size, i);
  group.visible = false;
  scene.add(group);
  books.push({ group, rest });
  stackY += size.thickness;
}

function render(t: number) {
  books.forEach(({ group, rest }, i) => {
    const p = pose(i, rest, t);
    group.visible = p.visible && p.scale > 0;
    group.position.set(p.x, p.y, p.z);
    group.rotation.set(0, p.yaw, p.roll, "YXZ");
    group.scale.setScalar(Math.max(p.scale, 1e-4));
  });
  renderer.render(scene, camera);
}

function resize() {
  const { clientWidth: w, clientHeight: h } = container;
  if (!w || !h) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let time = 0;
let last = performance.now();

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  time += dt;
  render(time);
}

function applyMotionPreference() {
  if (reduceMotion.matches) {
    renderer.setAnimationLoop(null);
    render(STATIC_TIME);
  } else {
    last = performance.now();
    renderer.setAnimationLoop(frame);
  }
}

window.addEventListener("resize", () => {
  resize();
  if (reduceMotion.matches) render(STATIC_TIME);
});
reduceMotion.addEventListener("change", applyMotionPreference);
resize();
applyMotionPreference();
