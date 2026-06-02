import type { ClashPair } from "../lib/schedule";

interface ClashBannerProps {
  clashes: ClashPair[];
  show: boolean;
  onDismiss: () => void;
}

export function ClashBanner({ clashes, show, onDismiss }: ClashBannerProps) {
  if (!show) return null;

  return (
    <div className="banner show" role="status">
      <div>
        <b>Schedule clash</b> - some of your starred talks overlap:
        <ul>
          {clashes.map(({ a, b }) => (
            <li key={`${a.id}-${b.id}`}>
              {a.title} <span>({a.start_time}-{a.end_time})</span> x {b.title} <span>({b.start_time}-{b.end_time})</span>
            </li>
          ))}
        </ul>
      </div>
      <button className="x" type="button" aria-label="Dismiss clash warning" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
