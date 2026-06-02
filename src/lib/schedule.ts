import { TRACK_ORDER } from "./constants";
import type { ConferenceData, Session } from "../types";

export interface Filters {
  tracksOff: Set<string>;
  theme: string;
}

export interface TimeBounds {
  dayStart: number;
  dayEnd: number;
}

export interface ClashPair {
  a: Session;
  b: Session;
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isBand(session: Session): boolean {
  return (
    session.type === "social" ||
    session.type === "housekeeping" ||
    session.track === "" ||
    session.track === "All"
  );
}

export function overlaps(a: Session, b: Session): boolean {
  return toMinutes(a.start_time) < toMinutes(b.end_time) && toMinutes(b.start_time) < toMinutes(a.end_time);
}

export function matchesFilter(session: Session, filters: Filters): boolean {
  if (isBand(session)) return true;
  if (filters.tracksOff.has(session.track)) return false;
  if (!filters.theme) return true;

  const themes = session.themes;
  const sessionThemes = [themes?.primary, ...(themes?.secondary ?? [])].filter(Boolean);
  return sessionThemes.includes(filters.theme);
}

export function sessionsForDay(data: ConferenceData, day: string): Session[] {
  return data.sessions.filter((session) => session.date === day);
}

export function tracksForDay(sessions: Session[]): string[] {
  return TRACK_ORDER.filter((track) => sessions.some((session) => !isBand(session) && session.track === track));
}

export function getTimeBounds(sessions: Session[]): TimeBounds {
  if (sessions.length === 0) return { dayStart: 0, dayEnd: 0 };
  return {
    dayStart: Math.min(...sessions.map((session) => toMinutes(session.start_time))),
    dayEnd: Math.max(...sessions.map((session) => toMinutes(session.end_time))),
  };
}

export function computeClashes(sessions: Session[], starredIds: Set<string>): { pairs: ClashPair[]; ids: Set<string> } {
  const starred = sessions.filter((session) => starredIds.has(session.id) && !isBand(session));
  const pairs: ClashPair[] = [];
  const ids = new Set<string>();

  for (let i = 0; i < starred.length; i += 1) {
    for (let j = i + 1; j < starred.length; j += 1) {
      if (overlaps(starred[i], starred[j])) {
        pairs.push({ a: starred[i], b: starred[j] });
        ids.add(starred[i].id);
        ids.add(starred[j].id);
      }
    }
  }

  return { pairs, ids };
}

export function makeSessionMap(data: ConferenceData): Map<string, Session> {
  return new Map(data.sessions.map((session) => [session.id, session]));
}
