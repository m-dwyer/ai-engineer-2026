import type { CSSProperties } from "react";
import { GRID_HEADER_HEIGHT, MIN_BLOCK_HEIGHT, PX_PER_MINUTE, TRACK_VAR, TYPE_ICON } from "../lib/constants";
import { getTimeBounds, isBand, matchesFilter, toMinutes, tracksForDay } from "../lib/schedule";
import type { ConferenceData, Session } from "../types";

interface ScheduleGridProps {
  clashes: Set<string>;
  data: ConferenceData;
  day: string;
  filters: { tracksOff: Set<string>; theme: string };
  stars: Set<string>;
  onOpenSession: (session: Session) => void;
  onToggleStar: (id: string) => void;
}

interface PositionedSession {
  session: Session;
  lane: number;
  laneCount: number;
  height: number;
}

const CRAMP_MINUTES = 12;

export function ScheduleGrid({ clashes, data, day, filters, stars, onOpenSession, onToggleStar }: ScheduleGridProps) {
  const sessions = data.sessions.filter((session) => session.date === day);
  const bands = sessions.filter(isBand).sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  const columnSessions = sessions.filter((session) => !isBand(session));
  const tracks = tracksForDay(sessions);
  const { dayStart, dayEnd } = getTimeBounds(sessions);
  const height = (dayEnd - dayStart) * PX_PER_MINUTE + GRID_HEADER_HEIGHT + 12;
  const startHour = Math.floor(dayStart / 60);
  const endHour = Math.ceil(dayEnd / 60);

  function top(minutes: number) {
    return GRID_HEADER_HEIGHT + (minutes - dayStart) * PX_PER_MINUTE;
  }

  return (
    <main className="wrap" data-testid="schedule-grid">
      <div className="grid" style={{ height }}>
        <div className="gutter" style={{ height }}>
          {Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index).map((hour) =>
            hour * 60 >= dayStart - 1 ? (
              <div className="hourlbl" key={hour} style={{ top: top(hour * 60) }}>
                {String(hour).padStart(2, "0")}:00
              </div>
            ) : null,
          )}
        </div>

        <div className="tracks" style={{ height }}>
          {Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index).map((hour) => (
            <div key={hour}>
              <div className="hrline" style={{ top: top(hour * 60) }} />
              <div className="hrline halfline" style={{ top: top(hour * 60 + 30) }} />
            </div>
          ))}

          <div className="cols" style={{ height }}>
            {tracks.map((track) => (
              <TrackColumn
                key={track}
                clashes={clashes}
                filters={filters}
                sessions={columnSessions.filter((session) => session.track === track)}
                stars={stars}
                top={top}
                track={track}
                onOpenSession={onOpenSession}
                onToggleStar={onToggleStar}
              />
            ))}
          </div>

          {bands.map((session) => {
            const blockHeight = Math.max(22, (toMinutes(session.end_time) - toMinutes(session.start_time)) * PX_PER_MINUTE - 2);
            const dim = !matchesFilter(session, filters);
            return (
              <button
                className={`band ${dim ? "dim" : ""}`}
                key={session.id}
                style={{ top: top(toMinutes(session.start_time)), height: blockHeight }}
                type="button"
                onClick={() => onOpenSession(session)}
              >
                <b>{session.title}</b>
                <span>
                  {session.start_time}-{session.end_time} {session.location ? `· ${session.location}` : ""}
                </span>
              </button>
            );
          })}

          <NowLine day={day} dayStart={dayStart} dayEnd={dayEnd} top={top} />
        </div>
      </div>
    </main>
  );
}

interface TrackColumnProps {
  clashes: Set<string>;
  filters: { tracksOff: Set<string>; theme: string };
  sessions: Session[];
  stars: Set<string>;
  top: (minutes: number) => number;
  track: string;
  onOpenSession: (session: Session) => void;
  onToggleStar: (id: string) => void;
}

function TrackColumn({ clashes, filters, sessions, stars, top, track, onOpenSession, onToggleStar }: TrackColumnProps) {
  const positioned = positionSessions(sessions);

  return (
    <div className="col">
      <div className="colhead" style={{ "--c": `var(${TRACK_VAR[track]})` } as CSSProperties}>
        <span className="dot" />
        {track}
      </div>
      {positioned.map(({ session, lane, laneCount, height }) => {
        const width = 100 / laneCount;
        const short = height <= MIN_BLOCK_HEIGHT + 6;
        const dim = !matchesFilter(session, filters);
        const starred = stars.has(session.id);
        const clash = clashes.has(session.id);
        return (
          <article
            className={`block ${short ? "short" : ""} ${dim ? "dim" : ""} ${starred ? "starred" : ""} ${clash ? "clash" : ""}`}
            data-id={session.id}
            key={session.id}
            style={{
              "--c": `var(${TRACK_VAR[track]})`,
              top: top(toMinutes(session.start_time)),
              height,
              left: `calc(${lane * width}% + 5px)`,
              width: `calc(${width}% - 10px)`,
            } as CSSProperties}
            onClick={() => onOpenSession(session)}
          >
            <button
              className={`star ${starred ? "on" : ""}`}
              type="button"
              title="Star this talk"
              onClick={(event) => {
                event.stopPropagation();
                onToggleStar(session.id);
              }}
            >
              {starred ? "★" : "☆"}
            </button>
            <div className="bt">
              {TYPE_ICON[session.type] ? <span className="tic">{TYPE_ICON[session.type]}</span> : null}
              {session.title}
            </div>
            <div className="bm">
              {session.start_time}-{session.end_time} {session.location ? <span className="room">{session.location}</span> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function positionSessions(sessions: Session[]): PositionedSession[] {
  const sorted = [...sessions].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time) || toMinutes(a.end_time) - toMinutes(b.end_time));
  const positioned: PositionedSession[] = [];
  let i = 0;

  while (i < sorted.length) {
    let j = i;
    let bound = occupiedUntil(sorted[i]);
    while (j + 1 < sorted.length && toMinutes(sorted[j + 1].start_time) < bound) {
      j += 1;
      bound = Math.max(bound, occupiedUntil(sorted[j]));
    }

    const cluster = sorted.slice(i, j + 1);
    const laneEnds: number[] = [];
    const lanes: Session[][] = [];
    const laneBySession = new Map<string, number>();

    for (const session of cluster) {
      let lane = 0;
      while (lane < laneEnds.length && toMinutes(session.start_time) < laneEnds[lane]) lane += 1;
      if (lane === laneEnds.length) {
        laneEnds.push(0);
        lanes.push([]);
      }
      laneEnds[lane] = occupiedUntil(session);
      lanes[lane].push(session);
      laneBySession.set(session.id, lane);
    }

    for (const session of cluster) {
      const lane = laneBySession.get(session.id) ?? 0;
      const laneSessions = lanes[lane];
      const next = laneSessions[laneSessions.indexOf(session) + 1];
      let height = Math.max(MIN_BLOCK_HEIGHT, (toMinutes(session.end_time) - toMinutes(session.start_time)) * PX_PER_MINUTE - 2);
      if (next) {
        height = Math.min(height, Math.max(14, (toMinutes(next.start_time) - toMinutes(session.start_time)) * PX_PER_MINUTE - 2));
      }
      positioned.push({ session, lane, laneCount: laneEnds.length, height });
    }

    i = j + 1;
  }

  return positioned;
}

function occupiedUntil(session: Session): number {
  return Math.max(toMinutes(session.end_time), toMinutes(session.start_time) + CRAMP_MINUTES);
}

interface NowLineProps {
  day: string;
  dayStart: number;
  dayEnd: number;
  top: (minutes: number) => number;
}

function NowLine({ day, dayStart, dayEnd, top }: NowLineProps) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (today !== day || nowMinutes < dayStart || nowMinutes > dayEnd) return null;
  return <div className="nowline" style={{ top: top(nowMinutes) }} />;
}
