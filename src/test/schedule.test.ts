import { describe, expect, it } from "vitest";
import { computeClashes, getTimeBounds, isBand, matchesFilter, overlaps, toMinutes, tracksForDay } from "../lib/schedule";
import type { Session } from "../types";

function session(overrides: Partial<Session>): Session {
  return {
    id: overrides.id ?? "session",
    title: overrides.title ?? "Session",
    description: overrides.description ?? "",
    type: overrides.type ?? "talk",
    track: overrides.track ?? "AI Engineering",
    date: overrides.date ?? "2026-06-03",
    start_time: overrides.start_time ?? "09:00",
    end_time: overrides.end_time ?? "09:30",
    duration_minutes: overrides.duration_minutes ?? 30,
    location: overrides.location ?? "Room",
    speakers: overrides.speakers ?? [],
    related_session_ids: overrides.related_session_ids,
    themes: overrides.themes,
  };
}

describe("schedule helpers", () => {
  it("parses clock time into minutes", () => {
    expect(toMinutes("08:15")).toBe(495);
    expect(toMinutes("17:30")).toBe(1050);
  });

  it("classifies all-track and housekeeping sessions as bands", () => {
    expect(isBand(session({ type: "housekeeping", track: "Keynote" }))).toBe(true);
    expect(isBand(session({ type: "talk", track: "All" }))).toBe(true);
    expect(isBand(session({ type: "talk", track: "AI Engineering" }))).toBe(false);
  });

  it("filters by track and theme while keeping bands visible", () => {
    const talk = session({ track: "AI Engineering", themes: { primary: "Agents", secondary: ["MLOps & Operations"] } });
    const filters = { tracksOff: new Set(["Leadership"]), theme: "Agents" };

    expect(matchesFilter(talk, filters)).toBe(true);
    expect(matchesFilter(talk, { tracksOff: new Set(["AI Engineering"]), theme: "" })).toBe(false);
    expect(matchesFilter(talk, { tracksOff: new Set(), theme: "Coding Agents" })).toBe(false);
    expect(matchesFilter(session({ type: "social", track: "" }), { tracksOff: new Set(["AI Engineering"]), theme: "Nope" })).toBe(true);
  });

  it("detects overlapping starred sessions", () => {
    const a = session({ id: "a", start_time: "10:00", end_time: "10:30" });
    const b = session({ id: "b", start_time: "10:15", end_time: "10:45" });
    const c = session({ id: "c", start_time: "10:45", end_time: "11:00" });
    const result = computeClashes([a, b, c], new Set(["a", "b", "c"]));

    expect(overlaps(a, b)).toBe(true);
    expect(overlaps(b, c)).toBe(false);
    expect(result.pairs).toHaveLength(1);
    expect([...result.ids]).toEqual(["a", "b"]);
  });

  it("derives visible tracks and day bounds", () => {
    const sessions = [
      session({ id: "a", track: "Leadership", start_time: "11:00", end_time: "12:00" }),
      session({ id: "b", track: "AI Engineering", start_time: "09:00", end_time: "09:30" }),
      session({ id: "c", type: "social", track: "", start_time: "08:00", end_time: "09:00" }),
    ];

    expect(tracksForDay(sessions)).toEqual(["AI Engineering", "Leadership"]);
    expect(getTimeBounds(sessions)).toEqual({ dayStart: 480, dayEnd: 720 });
  });
});
