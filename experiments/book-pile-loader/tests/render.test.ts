import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { start } from "../src/start";

const NAVY = [0x14, 0x21, 0x3d] as const;
const ORANGE = [0xfc, 0xa3, 0x11] as const;

type Rgb = readonly [number, number, number];

let container: HTMLDivElement;
let problems: string[];

function onWindowError(event: ErrorEvent) {
  problems.push(`pageerror: ${event.message}`);
}

beforeEach(() => {
  problems = [];
  vi.spyOn(console, "error").mockImplementation((...args) => {
    problems.push(`console: ${args.join(" ")}`);
  });
  window.addEventListener("error", onWindowError);
  document.body.style.cssText = "margin:0;background:#fff";
  container = document.createElement("div");
  container.id = "scene";
  container.style.cssText = "width:1000px;height:700px";
  document.body.append(container);
});

afterEach(() => {
  window.removeEventListener("error", onWindowError);
  vi.restoreAllMocks();
  container.remove();
});

async function setReducedMotion(value: "reduce" | "no-preference") {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value }],
  });
}

async function screenshotBase64() {
  return page.elementLocator(container).screenshot({ save: false });
}

// Decodes a PNG in the browser and counts pixels, so no PNG library is needed.
async function countPixels(base64: string, colours: Rgb[], tolerance: number) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
  const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  let nonWhite = 0;
  const matches = colours.map(() => 0);
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
    if (r < 240 || g < 240 || b < 240) nonWhite++;
    colours.forEach(([cr, cg, cb], k) => {
      if (
        Math.abs(r - cr) <= tolerance &&
        Math.abs(g - cg) <= tolerance &&
        Math.abs(b - cb) <= tolerance
      ) {
        matches[k]!++;
      }
    });
  }
  return { total: bitmap.width * bitmap.height, nonWhite, matches };
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

test("renders the finished pile without errors", async () => {
  await setReducedMotion("reduce");
  start(container);
  const canvas = await vi.waitFor(() => {
    const el = container.querySelector("canvas");
    expect(el).not.toBeNull();
    return el!;
  });

  expect(canvas.clientWidth).toBeGreaterThan(100);
  expect(canvas.clientHeight).toBeGreaterThan(100);

  await nextFrame();
  const stats = await countPixels(await screenshotBase64(), [NAVY, ORANGE], 24);

  expect(stats.nonWhite / stats.total).toBeGreaterThan(0.05);
  expect(stats.matches[0]).toBeGreaterThan(3000);
  expect(stats.matches[1]).toBeGreaterThan(5000);
  expect(problems).toEqual([]);
});

test("animates when reduced motion is off", async () => {
  await setReducedMotion("no-preference");
  start(container);
  await vi.waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const first = await screenshotBase64();
  await new Promise((resolve) => setTimeout(resolve, 700));
  const second = await screenshotBase64();

  for (const frame of [first, second]) {
    const stats = await countPixels(frame, [NAVY, ORANGE], 24);
    expect(stats.matches[0]! + stats.matches[1]!).toBeGreaterThan(10000);
  }
  expect(first).not.toBe(second);
  expect(problems).toEqual([]);
});
