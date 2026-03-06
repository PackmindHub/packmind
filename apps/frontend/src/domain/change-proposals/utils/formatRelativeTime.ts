import { format, formatDistanceToNowStrict } from 'date-fns';

export function formatRelativeTime(date: Date): string {
  return `${formatDistanceToNowStrict(new Date(date))} ago`;
}

export function formatExactDate(date: Date): string {
  return format(new Date(date), 'MMM d, yyyy, h:mm a');
}
