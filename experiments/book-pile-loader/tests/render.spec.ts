import { expect, test, type Page } from "@playwright/test";

const NAVY = [0x14, 0x21, 0x3d] as const;
const ORANGE = [0xfc, 0xa3, 0x11] as const;

type Png = { toString(encoding: "base64"): string };
type Rgb = readonly [number, number, number];

// Decodes a PNG inside the browser and counts pixels, so no PNG library is needed.
async function countPixels(page: Page, png: Png, colours: Rgb[], tolerance: number) {
  return page.evaluate(
    async ({ base64, colours, tolerance }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      const total = bitmap.width * bitmap.height;
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
      return { total, nonWhite, matches };
    },
    { base64: png.toString("base64"), colours, tolerance },
  );
}

async function openAndCollectErrors(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
  await page.goto("/");
  await page.locator("#scene canvas").waitFor();
  return problems;
}

test("renders the finished pile without errors", async ({ page }) => {
  const problems = await openAndCollectErrors(page);
  const canvas = page.locator("#scene canvas");

  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(100);
  expect(box?.height).toBeGreaterThan(100);

  await page.waitForTimeout(500);
  const stats = await countPixels(page, await page.screenshot(), [NAVY, ORANGE], 24);

  expect(stats.nonWhite / stats.total).toBeGreaterThan(0.05);
  expect(stats.matches[0]).toBeGreaterThan(3000);
  expect(stats.matches[1]).toBeGreaterThan(5000);
  expect(problems).toEqual([]);
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("animates", async ({ page }) => {
    const problems = await openAndCollectErrors(page);
    await page.waitForTimeout(1000);
    const first = await page.screenshot();
    await page.waitForTimeout(700);
    const second = await page.screenshot();
    expect(first.toString("base64")).not.toBe(second.toString("base64"));
    expect(problems).toEqual([]);
  });
});
