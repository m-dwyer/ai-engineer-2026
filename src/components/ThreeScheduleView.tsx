import { MapControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useMemo, useRef } from "react";
import { Vector3, type PerspectiveCamera } from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { TRACK_COLOR, TYPE_ICON } from "../lib/constants";
import { getTimeBounds, isBand, matchesFilter, toMinutes, tracksForDay } from "../lib/schedule";
import type { ConferenceData, Session } from "../types";

interface ThreeScheduleViewProps {
  clashes: Set<string>;
  data: ConferenceData;
  day: string;
  filters: { tracksOff: Set<string>; theme: string };
  stars: Set<string>;
  onOpenSession: (session: Session) => void;
  onToggleStar: (id: string) => void;
}

const Z_SCALE = 0.055;
const X_GAP = 1.85;
const INITIAL_CAMERA_POSITION = new Vector3(0, 12, 22);
const INITIAL_TARGET = new Vector3(0, 0, 0);

export function ThreeScheduleView({ clashes, data, day, filters, stars, onOpenSession, onToggleStar }: ThreeScheduleViewProps) {
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<MapControlsImpl | null>(null);
  const sessions = useMemo(() => data.sessions.filter((session) => session.date === day), [data, day]);
  const tracks = useMemo(() => {
    const matchingTalks = sessions.filter((session) => !isBand(session) && matchesFilter(session, filters));
    return tracksForDay(sessions).filter((track) => !filters.tracksOff.has(track) && matchingTalks.some((session) => session.track === track));
  }, [filters, sessions]);
  const { dayStart, dayEnd } = getTimeBounds(sessions);
  const duration = Math.max(1, dayEnd - dayStart);

  const updateCamera = useCallback((mutate: (camera: PerspectiveCamera, target: Vector3) => void) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    mutate(camera, controls.target);
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();
    controls.update();
  }, []);

  const rotateCamera = useCallback(
    (radians: number) => {
      updateCamera((camera, target) => {
        const offset = camera.position.clone().sub(target).applyAxisAngle(new Vector3(0, 1, 0), radians);
        camera.position.copy(target).add(offset);
      });
    },
    [updateCamera],
  );

  const zoomCamera = useCallback(
    (factor: number) => {
      updateCamera((camera, target) => {
        const offset = camera.position.clone().sub(target).multiplyScalar(factor);
        const clampedLength = Math.min(34, Math.max(8, offset.length()));
        offset.setLength(clampedLength);
        camera.position.copy(target).add(offset);
      });
    },
    [updateCamera],
  );

  const resetCamera = useCallback(() => {
    updateCamera((camera, target) => {
      target.copy(INITIAL_TARGET);
      camera.position.copy(INITIAL_CAMERA_POSITION);
    });
  }, [updateCamera]);

  return (
    <main className="threeWrap" data-testid="three-view">
      <Canvas
        camera={{ position: INITIAL_CAMERA_POSITION.toArray(), fov: 44 }}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ camera }) => {
          cameraRef.current = camera as PerspectiveCamera;
        }}
      >
        <color attach="background" args={["#07090d"]} />
        <fog attach="fog" args={["#07090d", 18, 42]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[7, 12, 8]} intensity={1.15} />
        <Suspense fallback={null}>
          <ScheduleScene
            clashes={clashes}
            dayStart={dayStart}
            duration={duration}
            filters={filters}
            sessions={sessions}
            stars={stars}
            tracks={tracks}
            onOpenSession={onOpenSession}
            onToggleStar={onToggleStar}
          />
        </Suspense>
        <MapControls
          ref={controlsRef}
          enableDamping
          enablePan
          maxPolarAngle={Math.PI / 2.08}
          minDistance={8}
          maxDistance={34}
          target={[0, 0, 0]}
        />
      </Canvas>
      <div className="threeHud">
        <span>3D prototype</span>
        <span>drag to pan</span>
        <span>click talks for details</span>
        <span>double-click to star</span>
      </div>
      <div className="threeControls" aria-label="3D camera controls">
        <button type="button" aria-label="Rotate left" onClick={() => rotateCamera(Math.PI / 10)}>
          ↺
        </button>
        <button type="button" aria-label="Zoom in" onClick={() => zoomCamera(0.82)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomCamera(1.18)}>
          −
        </button>
        <button type="button" aria-label="Rotate right" onClick={() => rotateCamera(-Math.PI / 10)}>
          ↻
        </button>
        <button className="wide" type="button" onClick={resetCamera}>
          Reset
        </button>
      </div>
    </main>
  );
}

interface ScheduleSceneProps {
  clashes: Set<string>;
  dayStart: number;
  duration: number;
  filters: { tracksOff: Set<string>; theme: string };
  sessions: Session[];
  stars: Set<string>;
  tracks: string[];
  onOpenSession: (session: Session) => void;
  onToggleStar: (id: string) => void;
}

function ScheduleScene({ clashes, dayStart, duration, filters, sessions, stars, tracks, onOpenSession, onToggleStar }: ScheduleSceneProps) {
  const trackIndex = new Map(tracks.map((track, index) => [track, index]));
  const centerOffset = ((tracks.length - 1) * X_GAP) / 2;
  const dayDepth = duration * Z_SCALE;
  const boardWidth = Math.max(2.6, tracks.length * X_GAP + 1.2);
  const visibleTalks = sessions.filter((session) => !isBand(session) && matchesFilter(session, filters) && trackIndex.has(session.track));
  const bands = sessions.filter(isBand);

  return (
    <group position={[0, -1.3, dayDepth / 2]}>
      <mesh position={[0, -0.12, -dayDepth / 2]}>
        <boxGeometry args={[boardWidth, 0.05, dayDepth + 1.3]} />
        <meshStandardMaterial color="#10141c" roughness={0.98} />
      </mesh>

      {tracks.map((track, index) => {
        const x = index * X_GAP - centerOffset;
        const color = TRACK_COLOR[track] ?? TRACK_COLOR.Event;
        return (
          <group key={track}>
            <mesh position={[x, 0, 0]}>
              <boxGeometry args={[1.28, 0.045, dayDepth]} />
              <meshStandardMaterial color="#161d2a" roughness={0.92} />
            </mesh>
            <mesh position={[x, 0.03, 0]}>
              <boxGeometry args={[1.18, 0.018, dayDepth]} />
              <meshStandardMaterial color={color} opacity={0.16} transparent roughness={0.82} />
            </mesh>
            <Text position={[x, 0.35, -dayDepth - 0.42]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.18} color={color} anchorX="center">
              {track}
            </Text>
          </group>
        );
      })}

      {bands.map((session) => {
        const start = toMinutes(session.start_time) - dayStart;
        const minutes = Math.max(6, toMinutes(session.end_time) - toMinutes(session.start_time));
        const z = -(start * Z_SCALE + (minutes * Z_SCALE) / 2);
        const depth = Math.max(0.08, minutes * Z_SCALE - 0.04);

        return (
          <group key={session.id} position={[0, 0.08, z]}>
            <mesh
              onClick={(event) => {
                event.stopPropagation();
                onOpenSession(session);
              }}
            >
              <boxGeometry args={[boardWidth - 0.55, 0.035, depth]} />
              <meshStandardMaterial color="#9aa6b8" opacity={0.26} transparent roughness={0.9} />
            </mesh>
            {depth > 0.55 ? (
              <Text position={[-boardWidth / 2 + 0.28, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.12} color="#c6ceda" maxWidth={2.2} anchorX="left">
                {session.start_time} {shortTitle(session.title, 36)}
              </Text>
            ) : null}
          </group>
        );
      })}

      {visibleTalks.map((session) => {
        const index = trackIndex.get(session.track);
        if (index === undefined) return null;

        const start = toMinutes(session.start_time) - dayStart;
        const minutes = Math.max(8, toMinutes(session.end_time) - toMinutes(session.start_time));
        const z = -(start * Z_SCALE + (minutes * Z_SCALE) / 2);
        const x = index * X_GAP - centerOffset;
        const depth = Math.max(0.25, minutes * Z_SCALE - 0.05);
        const color = TRACK_COLOR[session.track] ?? TRACK_COLOR.Event;
        const starred = stars.has(session.id);
        const clash = clashes.has(session.id);

        return (
          <group key={session.id} position={[x, 0.29, z]}>
            <mesh
              onClick={(event) => {
                event.stopPropagation();
                onOpenSession(session);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onToggleStar(session.id);
              }}
            >
              <boxGeometry args={[1.12, 0.26, depth]} />
              <meshStandardMaterial
                color={clash ? "#ffb454" : color}
                emissive={starred ? "#8a7100" : "#000000"}
                emissiveIntensity={starred ? 0.28 : 0}
                roughness={0.62}
              />
            </mesh>
            {depth > 0.48 ? (
              <Text position={[0, 0.155, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.105} color="#f7f8fb" maxWidth={1.02} anchorX="center" anchorY="middle">
                {starred ? "★ " : ""}
                {TYPE_ICON[session.type] ?? ""} {shortTitle(session.title, 64)}
              </Text>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function shortTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength - 1)}…`;
}
