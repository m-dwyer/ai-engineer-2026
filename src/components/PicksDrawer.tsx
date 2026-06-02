import { DAY_LABEL, TRACK_VAR, TYPE_ICON } from "../lib/constants";
import type { Session } from "../types";

interface PicksDrawerProps {
  show: boolean;
  picks: Session[];
  onPick: (session: Session) => void;
  onToggleStar: (id: string) => void;
  onClose: () => void;
}

export function PicksDrawer({ show, picks, onPick, onToggleStar, onClose }: PicksDrawerProps) {
  // Group picks by day, preserving the already-sorted (date, time) order.
  const groups: Array<{ date: string; items: Session[] }> = [];
  for (const session of picks) {
    const group = groups.find((entry) => entry.date === session.date);
    if (group) group.items.push(session);
    else groups.push({ date: session.date, items: [session] });
  }

  return (
    <>
      <div className={`scrim ${show ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer left ${show ? "show" : ""}`} aria-hidden={!show} aria-label="My picks">
        <div className="dh">
          <span className="typebadge">★ My picks</span>
          <button className="dclose" type="button" onClick={onClose} aria-label="Close picks">
            ×
          </button>
        </div>
        <div className="db">
          {picks.length === 0 ? (
            <div className="empty">No picks yet. Double-click a session (or use “Star this”) to add it here.</div>
          ) : (
            groups.map((group) => (
              <div className="sec" key={group.date}>
                <h3>{DAY_LABEL[group.date] ?? group.date}</h3>
                {group.items.map((item) => {
                  const cvar = TRACK_VAR[item.track] ?? "--t-band";
                  return (
                    <div className="pickrow" key={item.id}>
                      <button className="rel" type="button" onClick={() => onPick(item)}>
                        <span className="rt">
                          {TYPE_ICON[item.type] ?? ""} {item.title}
                        </span>
                        <span className="rm">
                          <span className="dot" style={{ background: `var(${cvar})` }} />
                          {item.track || "Event"} · {item.start_time}–{item.end_time}
                          {item.location ? ` · ${item.location}` : ""}
                        </span>
                      </button>
                      <button
                        className="pickstar"
                        type="button"
                        aria-label={`Remove ${item.title} from picks`}
                        title="Remove from picks"
                        onClick={() => onToggleStar(item.id)}
                      >
                        ★
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
