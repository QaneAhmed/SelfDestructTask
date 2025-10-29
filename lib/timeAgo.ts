const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(iso: string, reference = Date.now()): string {
  const created = Date.parse(iso);
  if (Number.isNaN(created)) {
    return "";
  }

  const diff = Math.max(0, reference - created);

  if (diff < MINUTE) {
    return "just now";
  }

  if (diff < HOUR) {
    const minutes = Math.round(diff / MINUTE);
    return `${minutes}m ago`;
  }

  if (diff < DAY) {
    const hours = Math.round(diff / HOUR);
    return `${hours}h ago`;
  }

  const days = Math.round(diff / DAY);
  return `${days}d ago`;
}
