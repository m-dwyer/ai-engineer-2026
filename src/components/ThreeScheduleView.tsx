import { ContactShadows, Edges, Environment, GradientTexture, Lightformer, MapControls, MeshReflectorMaterial, RoundedBox, Sparkles, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { BackSide, MOUSE, TOUCH, Vector3, type PerspectiveCamera } from "three";
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
const INITIAL_CAMERA_POSITION = new Vector3(0, 13.5, 16);
const INITIAL_TARGET = new Vector3(0, -0.5, -1.5);

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

  // Yaw — orbit around the world up axis
  const yawCamera = useCallback(
    (radians: number) => {
      updateCamera((camera, target) => {
        const offset = camera.position.clone().sub(target).applyAxisAngle(new Vector3(0, 1, 0), radians);
        camera.position.copy(target).add(offset);
      });
    },
    [updateCamera],
  );

  // Pitch — orbit around the camera's local right axis (look up / down)
  const pitchCamera = useCallback(
    (radians: number) => {
      updateCamera((camera, target) => {
        const offset = camera.position.clone().sub(target);
        const forward = target.clone().sub(camera.position).normalize();
        const right = forward.clone().cross(camera.up).normalize();
        offset.applyAxisAngle(right, radians);
        camera.position.copy(target).add(offset);
      });
    },
    [updateCamera],
  );

  // Roll — tilt the up vector around the view axis (bank left / right)
  const rollCamera = useCallback(
    (radians: number) => {
      updateCamera((camera, target) => {
        const forward = target.clone().sub(camera.position).normalize();
        camera.up.applyAxisAngle(forward, radians).normalize();
      });
    },
    [updateCamera],
  );

  const zoomCamera = useCallback(
    (factor: number) => {
      updateCamera((camera, target) => {
        const offset = camera.position.clone().sub(target).multiplyScalar(factor);
        const clampedLength = Math.min(40, Math.max(6, offset.length()));
        offset.setLength(clampedLength);
        camera.position.copy(target).add(offset);
      });
    },
    [updateCamera],
  );

  // Travel along the schedule — move camera + target together over the ground plane
  // (keeps the viewing angle, so it reads like scrolling forward/back through the day)
  const moveForward = useCallback(
    (distance: number) => {
      updateCamera((camera, target) => {
        const forward = target.clone().sub(camera.position);
        forward.y = 0;
        if (forward.lengthSq() < 1e-6) return;
        forward.normalize().multiplyScalar(distance);
        camera.position.add(forward);
        target.add(forward);
      });
    },
    [updateCamera],
  );

  const resetCamera = useCallback(() => {
    updateCamera((camera, target) => {
      target.copy(INITIAL_TARGET);
      camera.position.copy(INITIAL_CAMERA_POSITION);
      camera.up.set(0, 1, 0);
    });
  }, [updateCamera]);

  // Press-and-hold: pointer events unify mouse, touchpad, and touch. A quick tap fires
  // one nudge; holding repeats a smaller per-frame step for smooth continuous motion.
  const rafRef = useRef<number | null>(null);
  const stopHold = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);
  const beginHold = useCallback(
    (nudge: () => void, perFrame: () => void) => {
      stopHold();
      nudge();
      let frames = 0;
      const tick = () => {
        // brief pause before continuous repeat so a tap stays a single step
        if (frames++ > 12) perFrame();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [stopHold],
  );
  useEffect(() => stopHold, [stopHold]);

  const holdProps = useCallback(
    (nudge: () => void, perFrame: () => void) => ({
      onPointerDown: (event: React.PointerEvent) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        beginHold(nudge, perFrame);
      },
      onPointerUp: stopHold,
      onPointerLeave: stopHold,
      onPointerCancel: stopHold,
    }),
    [beginHold, stopHold],
  );

  // Wheel / two-finger trackpad scroll travels along the schedule; pinch (ctrl+wheel)
  // zooms. Captured before MapControls so it never double-handles the wheel — touch
  // pinch-zoom on phones is untouched (it uses touch events, handled by the controls).
  const wrapRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey || event.metaKey) {
        zoomCamera(event.deltaY > 0 ? 1.06 : 0.94);
      } else {
        moveForward(-event.deltaY * 0.013);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
  }, [zoomCamera, moveForward]);

  return (
    <main className="threeWrap" data-testid="three-view" ref={wrapRef}>
      <Canvas
        camera={{ position: INITIAL_CAMERA_POSITION.toArray(), fov: 44 }}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ camera }) => {
          cameraRef.current = camera as PerspectiveCamera;
        }}
      >
        <color attach="background" args={["#0c1022"]} />
        <fog attach="fog" args={["#0c1022", 34, 90]} />

        {/* Gradient sky dome — replaces the flat black void and gives the floor colour to mirror */}
        <mesh scale={120}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshBasicMaterial side={BackSide} fog={false} toneMapped={false} depthWrite={false}>
            <GradientTexture attach="map" stops={[0, 0.45, 0.72, 1]} colors={["#1b2456", "#161d3e", "#0c1022", "#070a16"]} size={256} />
          </meshBasicMaterial>
        </mesh>

        {/* Restrained fill — kept low so the card colours stay saturated, not chalky */}
        <ambientLight intensity={0.4} />
        <hemisphereLight args={["#9aa8ff", "#0a0f22", 0.5]} />
        {/* Soft key for specular highlights on the glossy cards (no hard shadow map) */}
        <directionalLight position={[8, 16, 6]} intensity={1.1} />
        {/* Coloured rim lights for a cinematic edge */}
        <pointLight position={[-13, 6, -4]} intensity={55} color="#f06fb0" distance={42} decay={2} />
        <pointLight position={[13, 5, 10]} intensity={55} color="#22c4d8" distance={42} decay={2} />

        {/* Baked studio environment gives the glossy cards something to reflect */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.6} position={[0, 6, -10]} scale={[14, 14, 1]} color="#aebfff" />
          <Lightformer intensity={1.3} position={[-6, 2, 2]} scale={[12, 3, 1]} color="#f06fb0" />
          <Lightformer intensity={1.3} position={[6, 2, 2]} scale={[12, 3, 1]} color="#22c4d8" />
          <Lightformer intensity={1} position={[0, 9, 5]} scale={[14, 4, 1]} color="#ffffff" />
        </Environment>

        <Sparkles count={60} scale={[48, 18, 64]} position={[0, 6, -8]} size={2} speed={0.2} opacity={0.35} color="#9fb4ff" />

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
          dampingFactor={0.08}
          enablePan
          enableRotate
          rotateSpeed={0.85}
          zoomSpeed={1.1}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI - 0.05}
          minDistance={6}
          maxDistance={40}
          target={INITIAL_TARGET.toArray()}
          mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
          touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        />
      </Canvas>
      <div className="threeHud">
        <span>3D prototype</span>
        <span>scroll / ⤒⤓ to move</span>
        <span>drag to orbit · pinch to zoom</span>
        <span>click talks · double-click to star</span>
      </div>
      <div className="threeControls" aria-label="3D camera controls">
        <button type="button" aria-label="Move forward" title="Move forward" {...holdProps(() => moveForward(1.3), () => moveForward(0.16))}>
          ⤒
        </button>
        <button type="button" aria-label="Move back" title="Move back" {...holdProps(() => moveForward(-1.3), () => moveForward(-0.16))}>
          ⤓
        </button>
        <button type="button" aria-label="Yaw left" title="Yaw left" {...holdProps(() => yawCamera(Math.PI / 11), () => yawCamera(0.014))}>
          ◄
        </button>
        <button type="button" aria-label="Yaw right" title="Yaw right" {...holdProps(() => yawCamera(-Math.PI / 11), () => yawCamera(-0.014))}>
          ►
        </button>
        <button type="button" aria-label="Pitch up" title="Pitch up" {...holdProps(() => pitchCamera(-Math.PI / 15), () => pitchCamera(-0.012))}>
          ▲
        </button>
        <button type="button" aria-label="Pitch down" title="Pitch down" {...holdProps(() => pitchCamera(Math.PI / 15), () => pitchCamera(0.012))}>
          ▼
        </button>
        <button type="button" aria-label="Roll left" title="Roll left" {...holdProps(() => rollCamera(-Math.PI / 13), () => rollCamera(-0.013))}>
          ⟲
        </button>
        <button type="button" aria-label="Roll right" title="Roll right" {...holdProps(() => rollCamera(Math.PI / 13), () => rollCamera(0.013))}>
          ⟳
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" {...holdProps(() => zoomCamera(0.85), () => zoomCamera(0.99))}>
          +
        </button>
        <button type="button" aria-label="Zoom out" title="Zoom out" {...holdProps(() => zoomCamera(1.15), () => zoomCamera(1.01))}>
          −
        </button>
        <button className="reset" type="button" onClick={resetCamera}>
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

  const floorY = -0.13;

  return (
    <group position={[0, -1.3, dayDepth / 2]}>
      {/* Polished reflective floor — gives the glossy cards a mirror to sit on */}
      <mesh position={[0, floorY, -dayDepth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[110, 150]} />
        <MeshReflectorMaterial
          resolution={1024}
          mixBlur={2.2}
          mixStrength={1.4}
          blur={[700, 220]}
          depthScale={1.2}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.4}
          color="#080b13"
          metalness={0.5}
          roughness={0.88}
          mirror={0}
        />
      </mesh>

      {/* Soft contact shadow grounds the whole arrangement without hard-edged stepping */}
      <ContactShadows
        position={[0, floorY + 0.005, -dayDepth / 2]}
        scale={[boardWidth + 4, dayDepth + 4]}
        resolution={1024}
        opacity={0.55}
        blur={2.6}
        far={2.5}
        color="#000000"
      />

      {tracks.map((track, index) => {
        const x = index * X_GAP - centerOffset;
        const color = TRACK_COLOR[track] ?? TRACK_COLOR.Event;
        return (
          <group key={track}>
            {/* Matte track "placemat" — groups cards by track, no glow, just a faint tint */}
            <mesh position={[x, floorY + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.34, dayDepth]} />
              <meshBasicMaterial color={color} transparent opacity={0.09} />
            </mesh>
            <Text
              position={[x, floorY + 0.02, -dayDepth - 0.5]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.14}
              color={shade(color, 0.25)}
              anchorX="center"
              anchorY="middle"
              textAlign="center"
              maxWidth={X_GAP - 0.18}
              lineHeight={1.05}
              letterSpacing={0.02}
              outlineWidth={0.008}
              outlineColor="#070a16"
            >
              {track.toUpperCase()}
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
          <group key={session.id} position={[0, floorY + 0.05, z]}>
            {/* Thin glossy break bar spanning the full board width */}
            <RoundedBox
              args={[boardWidth - 0.2, 0.08, depth]}
              radius={0.03}
              smoothness={4}
              onClick={(event) => {
                event.stopPropagation();
                onOpenSession(session);
              }}
            >
              <meshStandardMaterial color="#1b2334" roughness={0.35} metalness={0.4} envMapIntensity={1.1} />
            </RoundedBox>
            {depth > 0.55 ? (
              <Text
                position={[-boardWidth / 2 + 0.32, 0.07, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.12}
                color="#aeb8c8"
                maxWidth={2.4}
                anchorX="left"
                outlineWidth={0.004}
                outlineColor="#05060c"
              >
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
        const faceColor = clash ? "#ffb454" : color;

        const rim = starred ? "#ffe08a" : shade(faceColor, 0.28);

        // Fit the title to the tile's footprint so text never spills past the edges.
        const innerW = 0.98;
        const innerD = Math.max(0.18, depth - 0.14);
        const fontSize = Math.max(0.075, Math.min(0.115, innerD * 0.085 + 0.062));
        const lineH = 1.05;
        const charsPerLine = Math.max(8, Math.floor(innerW / (fontSize * 0.5)));
        const linesFit = Math.max(1, Math.floor(innerD / (fontSize * lineH)));
        const maxChars = Math.max(12, charsPerLine * linesFit - charsPerLine);

        return (
          <group key={session.id} position={[x, floorY + 0.12, z]}>
            {/* Sleek, flat, lacquered tile with a sheen rim that catches the coloured lights */}
            <RoundedBox
              args={[1.16, 0.14, depth]}
              radius={0.055}
              smoothness={5}
              onClick={(event) => {
                event.stopPropagation();
                onOpenSession(session);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onToggleStar(session.id);
              }}
            >
              <meshPhysicalMaterial
                color={shade(faceColor, -0.06)}
                emissive={starred ? "#ffcf45" : faceColor}
                emissiveIntensity={starred ? 0.4 : 0.16}
                roughness={0.36}
                metalness={0.05}
                clearcoat={1}
                clearcoatRoughness={0.16}
                sheen={0.7}
                sheenColor={shade(faceColor, 0.45)}
                sheenRoughness={0.5}
                envMapIntensity={1.4}
              />
              <Edges threshold={15} scale={1.0} color={rim} />
            </RoundedBox>
            {depth > 0.34 ? (
              <Text
                position={[0, 0.072, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={fontSize}
                lineHeight={lineH}
                color="#ffffff"
                maxWidth={innerW}
                anchorX="center"
                anchorY="middle"
                textAlign="center"
                clipRect={[-innerW / 2, -innerD / 2, innerW / 2, innerD / 2]}
                outlineWidth={fontSize * 0.12}
                outlineColor="#0a0d18"
                outlineOpacity={0.92}
              >
                {starred ? "★ " : ""}
                {TYPE_ICON[session.type] ?? ""} {shortTitle(session.title, maxChars)}
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

// Lighten (amount > 0) or darken (amount < 0) a hex colour, clamped to [0,255] per channel.
function shade(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  const adjust = (channel: number) => Math.max(0, Math.min(255, Math.round(channel + amount * 255)));
  const r = adjust((num >> 16) & 0xff);
  const g = adjust((num >> 8) & 0xff);
  const b = adjust(num & 0xff);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
