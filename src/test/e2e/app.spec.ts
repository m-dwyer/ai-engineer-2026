import { expect, test } from "@playwright/test";

test("loads the schedule, opens details, and switches to the 3D prototype", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI Engineer Melbourne 2026" })).toBeVisible();
  await expect(page.getByTestId("schedule-grid")).toBeVisible();

  await page.locator(".block").first().click();
  await expect(page.locator(".drawer.show h2")).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();

  await page.getByRole("button", { name: "3D" }).click();
  await expect(page.getByTestId("three-view")).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  // The 3D view renders on demand (during the grid→3D morph) plus a one-time shader compile, so
  // first paint lands ~1s after mount rather than immediately — give it room before sampling.
  await page.waitForTimeout(2500);

  const hasDrawnPixels = await canvas.evaluate((node) => {
    const target = node as HTMLCanvasElement;
    const gl = target.getContext("webgl2") ?? target.getContext("webgl");
    if (!gl) return false;

    const width = Math.max(1, gl.drawingBufferWidth);
    const height = Math.max(1, gl.drawingBufferHeight);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] > 12 || pixels[index + 1] > 12 || pixels[index + 2] > 12) {
        return true;
      }
    }
    return false;
  });
  expect(hasDrawnPixels).toBe(true);
});
