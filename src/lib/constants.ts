export const EMBEDDED_AT = "2026-06-02";
export const LS_STARS = "aieng_stars_v1";
export const LS_CACHE = "aieng_cache_v1";
export const LS_THEME = "aieng_theme_v1";
export const SRC_URL = "https://data.webdirections.org/ai-engineer/sessions.json";

export const TRACK_ORDER = [
  "Keynote",
  "AI Engineering",
  "Software Engineering",
  "Leadership",
  "Hallway",
  "Workshop",
] as const;

export const TRACK_VAR: Record<string, string> = {
  Keynote: "--t-keynote",
  "AI Engineering": "--t-ai",
  "Software Engineering": "--t-se",
  Leadership: "--t-lead",
  Hallway: "--t-hall",
  Workshop: "--t-work",
};

export const TRACK_COLOR: Record<string, string> = {
  Keynote: "#a78bfa",
  "AI Engineering": "#5b9dff",
  "Software Engineering": "#22c993",
  Leadership: "#f5a623",
  Hallway: "#f06fb0",
  Workshop: "#22c4d8",
  Event: "#94a3b8",
};

export const DAY_LABEL: Record<string, string> = {
  "2026-06-03": "Wed 3 Jun",
  "2026-06-04": "Thu 4 Jun",
};

export const TYPE_ICON: Record<string, string> = {
  keynote: "★",
  panel: "⧉",
  conversation: "❝",
  talk: "◆",
  workshop: "✦",
  social: "◉",
  housekeeping: "•",
  break: "•",
};

export const PX_PER_MINUTE = 1.5;
export const GRID_HEADER_HEIGHT = 30;
export const MIN_BLOCK_HEIGHT = 26;
