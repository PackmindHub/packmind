export const EMPTY_PLACEHOLDER = '—';

export const formatCount = (count: number | null): string => {
  if (count === null || !Number.isFinite(count)) {
    return EMPTY_PLACEHOLDER;
  }
  return String(count);
};

export const formatCreatedAt = (iso: string | null): string => {
  if (iso === null) {
    return EMPTY_PLACEHOLDER;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return EMPTY_PLACEHOLDER;
  }
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};
