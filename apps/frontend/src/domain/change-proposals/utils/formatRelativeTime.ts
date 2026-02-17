import { formatDistanceToNowStrict } from 'date-fns';

export function formatRelativeTime(date: Date): string {
  return `${formatDistanceToNowStrict(new Date(date))} ago`;
}
