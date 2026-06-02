import type { CSSProperties } from "react";
import { DAY_LABEL, TRACK_ORDER, TRACK_VAR } from "../lib/constants";
import type { ConferenceData, ScheduleView } from "../types";

interface HeaderProps {
  activeView: ScheduleView;
  data: ConferenceData;
  dataAge: string;
  day: string;
  refreshState: "idle" | "loading" | "updated" | "offline";
  selectedTheme: string;
  starCount: number;
  theme: "dark" | "light";
  tracksOff: Set<string>;
  onDayChange: (day: string) => void;
  onRefresh: () => void;
  onResetFilters: () => void;
  onThemeChange: (theme: string) => void;
  onThemeToggle: () => void;
  onToggleTrack: (track: string) => void;
  onViewChange: (view: ScheduleView) => void;
}

export function Header({
  activeView,
  data,
  dataAge,
  day,
  refreshState,
  selectedTheme,
  starCount,
  theme,
  tracksOff,
  onDayChange,
  onRefresh,
  onResetFilters,
  onThemeChange,
  onThemeToggle,
  onToggleTrack,
  onViewChange,
}: HeaderProps) {
  const refreshLabel = refreshState === "loading" ? "..." : refreshState === "updated" ? "Updated" : refreshState === "offline" ? "Offline" : "Refresh";

  return (
    <header>
      <div className="titlerow">
        <h1>{data.conference.name}</h1>
        <span className="sub">data as of {dataAge}</span>
        <span className="grow" />
        <span className="count">{starCount ? `★ ${starCount} pick${starCount > 1 ? "s" : ""}` : ""}</span>
        <div className="segmented" aria-label="Schedule view">
          <button className={activeView === "grid" ? "on" : ""} type="button" onClick={() => onViewChange("grid")}>
            Grid
          </button>
          <button className={activeView === "three" ? "on" : ""} type="button" onClick={() => onViewChange("three")}>
            3D
          </button>
        </div>
        <button className="btn iconbtn" type="button" title={theme === "light" ? "Switch to dark" : "Switch to light"} onClick={onThemeToggle}>
          {theme === "light" ? "☾" : "☀"}
        </button>
        <button className="btn" type="button" title="Pull the latest schedule" disabled={refreshState === "loading"} onClick={onRefresh}>
          {refreshLabel}
        </button>
      </div>

      <div className="controls">
        <div className="days" aria-label="Conference day">
          {data.days.map((candidate) => (
            <button className={`day ${candidate === day ? "on" : ""}`} key={candidate} type="button" onClick={() => onDayChange(candidate)}>
              {DAY_LABEL[candidate] ?? candidate}
            </button>
          ))}
        </div>

        <div className="chips" aria-label="Track filters">
          {TRACK_ORDER.map((track) => {
            const on = !tracksOff.has(track);
            return (
              <button
                className={`chip ${on ? "on" : "off"}`}
                key={track}
                style={{ "--c": `var(${TRACK_VAR[track]})` } as CSSProperties}
                type="button"
                onClick={() => onToggleTrack(track)}
              >
                <span className="dot" />
                {track}
              </button>
            );
          })}
        </div>

        <select className="theme" title="Filter by theme" value={selectedTheme} onChange={(event) => onThemeChange(event.currentTarget.value)}>
          <option value="">All themes</option>
          {(data.themes_order ?? []).map((themeName) => (
            <option key={themeName} value={themeName}>
              {themeName}
            </option>
          ))}
        </select>

        <button className="btn" type="button" onClick={onResetFilters}>
          Reset filters
        </button>
      </div>
    </header>
  );
}
