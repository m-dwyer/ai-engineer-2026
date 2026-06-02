import { LS_CACHE, LS_STARS, LS_THEME } from "./constants";
import seedData from "../data/seed.json";
import type { ConferenceData } from "../types";

const seed = seedData as ConferenceData;

export function loadConferenceData(): ConferenceData {
  try {
    const cached = localStorage.getItem(LS_CACHE);
    if (cached) {
      const parsed = JSON.parse(cached) as Partial<ConferenceData>;
      if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
        return parsed as ConferenceData;
      }
    }
  } catch {
    // Fall through to the embedded seed.
  }

  return seed;
}

export function saveConferenceData(data: ConferenceData): void {
  localStorage.setItem(LS_CACHE, JSON.stringify(data));
}

export function loadStarIds(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_STARS) ?? "[]") as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveStarIds(stars: Set<string>): void {
  localStorage.setItem(LS_STARS, JSON.stringify([...stars]));
}

export function loadTheme(): "dark" | "light" {
  try {
    return localStorage.getItem(LS_THEME) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveTheme(theme: "dark" | "light"): void {
  localStorage.setItem(LS_THEME, theme);
}
