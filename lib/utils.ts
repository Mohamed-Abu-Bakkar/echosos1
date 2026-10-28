export { Slot } from '@/components/ui/slot';

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

/** Relative/absolute timestamp for history + notification rows. */
export function formatTimestamp(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return value || '—';

  const now = new Date();
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === now.toDateString()) {
    const diff = now.getTime() - date.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} min ago`;
    return `Today, ${time}`;
  }

  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

/** Clock time for SOS detection stamps. */
export function formatTime(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return value || '—';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
