import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { ClashBanner } from "./components/ClashBanner";
import { DetailDrawer } from "./components/DetailDrawer";
import { PicksDrawer } from "./components/PicksDrawer";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { toMinutes } from "./lib/schedule";
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
import type { ThreePhase } from "./components/ThreeScheduleView";

const ThreeScheduleView = lazy(() =>
  import("./components/ThreeScheduleView").then((module) => ({ default: module.ThreeScheduleView })),
);

// Morph between Grid and 3D: "in" plays grid→3D, "out" plays 3D→grid; the steady states are
// "grid" and "three". Both views are mounted during a transition so the camera tilt + tile
// extrude can play before the grid is torn down (and vice-versa).
type ViewPhase = "grid" | "in" | "three" | "out";

export function App() {
  const [data, setData] = useState<ConferenceData>(() => loadConferenceData());
  const [day, setDay] = useState(() => loadConferenceData().days[0]);
  const [tracksOff, setTracksOff] = useState<Set<string>>(() => new Set());
  const [selectedTheme, setSelectedTheme] = useState("");
  const [stars, setStars] = useState<Set<string>>(() => loadStarIds());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => loadTheme());
  const [viewPhase, setViewPhase] = useState<ViewPhase>("grid");
  // True once the 3D canvas has actually painted its first frame. The grid stays on top and
  // visible until then, so a grid→3D switch crossfades grid → painted-3D with no black flash
  // while shaders compile.
  const [threeReady, setThreeReady] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "updated" | "offline">("idle");
  const [clashDismissed, setClashDismissed] = useState(false);
  const [picksOpen, setPicksOpen] = useState(false);

  const sessionMap = useMemo(() => makeSessionMap(data), [data]);
  const daySessions = useMemo(() => sessionsForDay(data, day), [data, day]);
  const clashes = useMemo(() => computeClashes(daySessions, stars), [daySessions, stars]);
  const selectedSession = selectedSessionId ? sessionMap.get(selectedSessionId) ?? null : null;
  const filters = useMemo(() => ({ tracksOff, theme: selectedTheme }), [tracksOff, selectedTheme]);

  // Starred sessions across all days, sorted chronologically for the picks panel.
  const picks = useMemo(
    () =>
      [...stars]
        .map((id) => sessionMap.get(id))
        .filter((session): session is Session => Boolean(session))
        .sort((a, b) => (a.date === b.date ? toMinutes(a.start_time) - toMinutes(b.start_time) : a.date.localeCompare(b.date))),
    [stars, sessionMap],
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  // Warm the lazy 3D chunk in the background so the first grid→3D morph plays immediately
  // instead of stalling on a network fetch behind the "Loading 3D view" fallback.
  useEffect(() => {
    void import("./components/ThreeScheduleView");
  }, []);

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

  function jumpToPick(session: Session) {
    if (session.date !== day) setDay(session.date);
    setSelectedSessionId(session.id);
    setPicksOpen(false);
  }

  const visibleClashBanner = clashes.pairs.length > 0 && !clashDismissed;

  // The toggle reflects the destination the user is heading toward, so it highlights correctly
  // mid-transition (e.g. "Grid" stays lit while the 3D view animates back out).
  const headerView: ScheduleView = viewPhase === "grid" || viewPhase === "out" ? "grid" : "three";
  const showGrid = viewPhase !== "three";
  const showThree = viewPhase !== "grid";
  const threePhase: ThreePhase = viewPhase === "in" ? "in" : viewPhase === "out" ? "out" : "three";

  function requestView(view: ScheduleView) {
    if (view === "three")
      setViewPhase((current) => {
        if (current === "three" || current === "in") return current;
        setThreeReady(false); // grid stays on top until the fresh canvas paints
        return "in";
      });
    else setViewPhase((current) => (current === "grid" || current === "out" ? current : "out"));
  }

  function onThreePhaseDone(donePhase: ThreePhase) {
    if (donePhase === "in") setViewPhase((current) => (current === "in" ? "three" : current));
    else if (donePhase === "out") setViewPhase((current) => (current === "out" ? "grid" : current));
  }

  return (
    <>
      <Header
        activeView={headerView}
        data={data}
        dataAge={data.updated_at?.slice(0, 10) ?? EMBEDDED_AT}
        day={day}
        refreshState={refreshState}
        selectedTheme={selectedTheme}
        starCount={picks.length}
        theme={theme}
        tracksOff={tracksOff}
        onDayChange={setDay}
        onOpenPicks={() => setPicksOpen(true)}
        onRefresh={refreshSchedule}
        onResetFilters={resetFilters}
        onThemeChange={setSelectedTheme}
        onThemeToggle={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onToggleTrack={toggleTrack}
        onViewChange={requestView}
      />

      <ClashBanner clashes={clashes.pairs} show={visibleClashBanner} onDismiss={() => setClashDismissed(true)} />

      <div className="viewStage" data-phase={viewPhase} data-three-ready={threeReady}>
        {showGrid ? (
          <ScheduleGrid
            clashes={clashes.ids}
            data={data}
            day={day}
            filters={filters}
            stars={stars}
            onOpenSession={openSession}
            onToggleStar={toggleStar}
          />
        ) : null}
        {showThree ? (
          // No visible fallback: during a grid→3D switch the grid is still mounted on top, so it
          // shows through (rather than a dark "loading" panel) while the lazy chunk/shaders load.
          <Suspense fallback={null}>
            <ThreeScheduleView
              clashes={clashes.ids}
              data={data}
              day={day}
              filters={filters}
              phase={threePhase}
              stars={stars}
              onOpenSession={openSession}
              onPhaseDone={onThreePhaseDone}
              onReady={() => setThreeReady(true)}
              onToggleStar={toggleStar}
            />
          </Suspense>
        ) : null}
      </div>

      <PicksDrawer
        show={picksOpen}
        picks={picks}
        onPick={jumpToPick}
        onToggleStar={toggleStar}
        onClose={() => setPicksOpen(false)}
      />

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
