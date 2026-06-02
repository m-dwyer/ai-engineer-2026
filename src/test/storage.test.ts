import { beforeEach, describe, expect, it } from "vitest";
import { loadStarIds, loadTheme, saveStarIds, saveTheme } from "../lib/storage";

describe("storage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips starred session ids", () => {
    saveStarIds(new Set(["a", "b"]));
    expect([...loadStarIds()]).toEqual(["a", "b"]);
  });

  it("ignores invalid starred session payloads", () => {
    localStorage.setItem("aieng_stars_v1", "{\"nope\":true}");
    expect([...loadStarIds()]).toEqual([]);
  });

  it("defaults to dark theme and persists light theme", () => {
    expect(loadTheme()).toBe("dark");
    saveTheme("light");
    expect(loadTheme()).toBe("light");
  });
});
