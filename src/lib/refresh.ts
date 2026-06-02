import { SRC_URL } from "./constants";
import type { ConferenceData } from "../types";

export async function fetchLatestSchedule(): Promise<ConferenceData> {
  const response = await fetch(SRC_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Schedule refresh failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as Partial<ConferenceData>;
  if (!Array.isArray(data.sessions) || data.sessions.length === 0) {
    throw new Error("Schedule refresh returned invalid data");
  }

  return data as ConferenceData;
}
