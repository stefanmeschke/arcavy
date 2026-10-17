import * as THREE from "three";
import { createBook } from "./book";
import { createGroundShadow } from "./shadow";
import { createDebugControls } from "./debug";
import { PILE_HEIGHT, PILE_SIZES, createPile } from "./pile";
import { CAMERA_AZIMUTH_DEG, STATIC_TIME, TOTAL_TIME, pose } from "./timeline";

const container = document.getElementById("scene") as HTMLElement;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0xffffff, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 2.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(-4, 10, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 16;
sun.shadow.blurSamples = 16;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
const bounds = sun.shadow.camera;
bounds.left = -4;
bounds.right = 4;
bounds.top = 4;
bounds.bottom = -4;
bounds.near = 1;
bounds.far = 25;
scene.add(sun);

const groundShadow = createGroundShadow(sun.position, new THREE.Vector2(0.6, 0));
scene.add(groundShadow.object);

const PILE_CENTER = new THREE.Vector3(0.0, PILE_HEIGHT / 2 - 0.1, 0);
const CAMERA_AZIMUTH = THREE.MathUtils.degToRad(CAMERA_AZIMUTH_DEG);
const CAMERA_ELEVATION = THREE.MathUtils.degToRad(20); // low, so spines and page faces dominate
const CAMERA_DIRECTION = new THREE.Vector3(
  Math.sin(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION),
  Math.sin(CAMERA_ELEVATION),
  Math.cos(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION),
);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

// Build the pile: deterministic sizes, alternating angles and casual offsets
const rests = createPile();
const books = rests.map((rest, i) => {
  const group = createBook(PILE_SIZES[i], i);
  group.visible = false;
  scene.add(group);
  return { group, rest };
});

function render(t: number) {
  books.forEach(({ group, rest }, i) => {
    const p = pose(i, rest, t);
    group.visible = p.visible && p.scale > 0;
    group.position.set(p.x, p.y, p.z);
    group.rotation.set(0, p.yaw, p.roll, "YXZ");
    group.scale.setScalar(Math.max(p.scale, 1e-4));
  });
  groundShadow.update(books.map(({ group }, i) => ({ group, size: PILE_SIZES[i] })));
  renderer.render(scene, camera);
}

function resize() {
  const { clientWidth: w, clientHeight: h } = container;
  if (!w || !h) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  const aspect = w / h;
  camera.aspect = aspect;
  // pull back on narrow screens so the whole pile and shadow stay in frame
  const halfHeight = PILE_HEIGHT / 2 + 0.7; // pile + shadow, in world units at the pile centre
  const halfWidth = 2.7;
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance = Math.max(halfHeight, halfWidth / aspect) / tan;
  camera.position.copy(PILE_CENTER).addScaledVector(CAMERA_DIRECTION, distance);
  camera.lookAt(PILE_CENTER);
  camera.updateProjectionMatrix();
}

// Dev server only; stripped from production builds.
const debug = import.meta.env.DEV
  ? createDebugControls(TOTAL_TIME, (t) => {
      time = t;
      render(t);
    })
  : undefined;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let time = 0;
let last = performance.now();

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!debug?.paused) time = (time + dt * (debug?.speed ?? 1)) % TOTAL_TIME;
  debug?.sync(time);
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
