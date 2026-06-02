import { TRACK_VAR, TYPE_ICON } from "../lib/constants";
import type { Session } from "../types";

interface DetailDrawerProps {
  session: Session | null;
  sessionMap: Map<string, Session>;
  isStarred: boolean;
  onClose: () => void;
  onOpenRelated: (session: Session) => void;
  onToggleStar: (id: string) => void;
}

export function DetailDrawer({ session, sessionMap, isStarred, onClose, onOpenRelated, onToggleStar }: DetailDrawerProps) {
  const show = session !== null;
  const cvar = session ? TRACK_VAR[session.track] ?? "--t-band" : "--t-band";
  const related = (session?.related_session_ids ?? []).map((id) => sessionMap.get(id)).filter((item): item is Session => Boolean(item)).slice(0, 5);

  return (
    <>
      <div className={`scrim ${show ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer ${show ? "show" : ""}`} aria-hidden={!show}>
        {session ? (
          <>
            <div className="dh">
              <span className="typebadge">
                {TYPE_ICON[session.type] ?? ""} {session.type}
              </span>
              <button className="dclose" type="button" onClick={onClose} aria-label="Close details">
                ×
              </button>
            </div>
            <div className="db">
              <h2>{session.title}</h2>
              <div className="meta">
                <span className="pill">
                  <span className="dot" style={{ background: `var(${cvar})` }} />
                  {session.track || "Event"}
                </span>
                <span className="pill">{session.start_time}-{session.end_time}</span>
                {session.location ? <span className="pill">{session.location}</span> : null}
                <button className={`dstar ${isStarred ? "on" : ""}`} type="button" onClick={() => onToggleStar(session.id)}>
                  {isStarred ? "★ Starred" : "☆ Star this"}
                </button>
              </div>

              {session.description ? <div className="desc">{session.description}</div> : <div className="empty">No description provided.</div>}

              {session.speakers.length > 0 ? (
                <div className="sec">
                  <h3>Speaker{session.speakers.length > 1 ? "s" : ""}</h3>
                  {session.speakers.map((speaker) => {
                    const social = speaker.social ?? {};
                    const linkCandidates: Array<[string, string | null | undefined]> = [
                      ["website", social.website],
                      ["linkedin", social.linkedin],
                      ["bluesky", social.bluesky],
                      ["mastodon", social.mastodon],
                      ["social", social.social_media],
                    ];
                    const links: Array<[string, string]> = linkCandidates.flatMap(([label, href]) => (href ? [[label, href]] : []));
                    const role = [speaker.job_title, speaker.employer].filter(Boolean).join(" · ");

                    return (
                      <div className="spk" key={speaker.id}>
                        {speaker.photo_url ? <img src={speaker.photo_url} alt="" onError={(event) => (event.currentTarget.style.visibility = "hidden")} /> : <img alt="" />}
                        <div>
                          <div className="nm">{speaker.full_name}</div>
                          {role ? <div className="role">{role}</div> : null}
                          {links.length > 0 ? (
                            <div className="lnks">
                              {links.map(([label, href]) => (
                                <a href={href} key={`${speaker.id}-${label}`} target="_blank" rel="noopener noreferrer">
                                  {label}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {session.themes?.primary || session.themes?.secondary?.length ? (
                <div className="sec">
                  <h3>Themes</h3>
                  <div className="themechips">
                    {session.themes.primary ? <span className="tchip primary">{session.themes.primary}</span> : null}
                    {(session.themes.secondary ?? []).map((theme) => (
                      <span className="tchip" key={theme}>
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {related.length > 0 ? (
                <div className="sec">
                  <h3>Related sessions</h3>
                  {related.map((item) => (
                    <button className="rel" key={item.id} type="button" onClick={() => onOpenRelated(item)}>
                      <span className="rt">{item.title}</span>
                      <span className="rm">
                        {item.track || "Event"} · {item.start_time}-{item.end_time} · {item.location ?? ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
