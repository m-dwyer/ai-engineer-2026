import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { ClashBanner } from "./components/ClashBanner";
import { DetailDrawer } from "./components/DetailDrawer";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { EMBEDDED_AT } from "./lib/constants";
import { fetchLatestSchedule } from "./lib/refresh";
import { computeClashes, makeSessionMap, sessionsForDay } from "./lib/schedule";
import {
  loadConferenceData,
  loadStarIds,
  loadTheme,
  saveConferenceData,
  saveStarIds,
  saveTheme,
} from "./lib/storage";
import type { ConferenceData, ScheduleView, Session } from "./types";

const ThreeScheduleView = lazy(() =>
  import("./components/ThreeScheduleView").then((module) => ({ default: module.ThreeScheduleView })),
);

export function App() {
  const [data, setData] = useState<ConferenceData>(() => loadConferenceData());
  const [day, setDay] = useState(() => loadConferenceData().days[0]);
  const [tracksOff, setTracksOff] = useState<Set<string>>(() => new Set());
  const [selectedTheme, setSelectedTheme] = useState("");
  const [stars, setStars] = useState<Set<string>>(() => loadStarIds());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => loadTheme());
  const [activeView, setActiveView] = useState<ScheduleView>("grid");
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "updated" | "offline">("idle");
  const [clashDismissed, setClashDismissed] = useState(false);

  const sessionMap = useMemo(() => makeSessionMap(data), [data]);
  const daySessions = useMemo(() => sessionsForDay(data, day), [data, day]);
  const clashes = useMemo(() => computeClashes(daySessions, stars), [daySessions, stars]);
  const selectedSession = selectedSessionId ? sessionMap.get(selectedSessionId) ?? null : null;
  const filters = useMemo(() => ({ tracksOff, theme: selectedTheme }), [tracksOff, selectedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveStarIds(stars);
  }, [stars]);

  function toggleTrack(track: string) {
    setTracksOff((current) => {
      const next = new Set(current);
      if (next.has(track)) next.delete(track);
      else next.add(track);
      return next;
    });
  }

  function toggleStar(id: string) {
    setStars((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setClashDismissed(false);
  }

  function resetFilters() {
    setTracksOff(new Set());
    setSelectedTheme("");
  }

  async function refreshSchedule() {
    setRefreshState("loading");
    try {
      const latest = await fetchLatestSchedule();
      saveConferenceData(latest);
      setData(latest);
      setDay((currentDay) => (latest.days.includes(currentDay) ? currentDay : latest.days[0]));
      setRefreshState("updated");
      window.setTimeout(() => setRefreshState("idle"), 1500);
    } catch {
      setRefreshState("offline");
      window.setTimeout(() => setRefreshState("idle"), 1800);
    }
  }

  function openSession(session: Session) {
    setSelectedSessionId(session.id);
  }

  const visibleClashBanner = clashes.pairs.length > 0 && !clashDismissed;

  return (
    <>
      <Header
        activeView={activeView}
        data={data}
        dataAge={data.updated_at?.slice(0, 10) ?? EMBEDDED_AT}
        day={day}
        refreshState={refreshState}
        selectedTheme={selectedTheme}
        starCount={[...stars].filter((id) => sessionMap.has(id)).length}
        theme={theme}
        tracksOff={tracksOff}
        onDayChange={setDay}
        onRefresh={refreshSchedule}
        onResetFilters={resetFilters}
        onThemeChange={setSelectedTheme}
        onThemeToggle={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onToggleTrack={toggleTrack}
        onViewChange={setActiveView}
      />

      <ClashBanner clashes={clashes.pairs} show={visibleClashBanner} onDismiss={() => setClashDismissed(true)} />

      {activeView === "grid" ? (
        <ScheduleGrid
          clashes={clashes.ids}
          data={data}
          day={day}
          filters={filters}
          stars={stars}
          onOpenSession={openSession}
          onToggleStar={toggleStar}
        />
      ) : (
        <Suspense fallback={<main className="threeWrap loading">Loading 3D view...</main>}>
          <ThreeScheduleView
            clashes={clashes.ids}
            data={data}
            day={day}
            filters={filters}
            stars={stars}
            onOpenSession={openSession}
            onToggleStar={toggleStar}
          />
        </Suspense>
      )}

      <DetailDrawer
        session={selectedSession}
        sessionMap={sessionMap}
        isStarred={selectedSession ? stars.has(selectedSession.id) : false}
        onClose={() => setSelectedSessionId(null)}
        onOpenRelated={(session) => setSelectedSessionId(session.id)}
        onToggleStar={toggleStar}
      />
    </>
  );
}
