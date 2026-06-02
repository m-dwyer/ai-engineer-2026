export interface Conference {
  slug: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  url: string;
  event_tag: string;
}

export interface SpeakerSocial {
  social_media?: string | null;
  linkedin?: string | null;
  bluesky?: string | null;
  mastodon?: string | null;
  website?: string | null;
}

export interface Speaker {
  id: string;
  slug: string;
  full_name: string;
  job_title?: string | null;
  employer?: string | null;
  bio_short?: string | null;
  photo_url?: string | null;
  social?: SpeakerSocial | null;
}

export interface SessionThemes {
  primary?: string | null;
  secondary?: string[];
  scores?: Record<string, number>;
}

export interface Session {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  track: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location?: string | null;
  speakers: Speaker[];
  related_session_ids?: string[];
  themes?: SessionThemes;
}

export interface ConferenceData {
  conference: Conference;
  updated_at?: string;
  tracks: string[];
  days: string[];
  themes_order?: string[];
  session_types?: string[];
  sessions: Session[];
}

export type ScheduleView = "grid" | "three";
