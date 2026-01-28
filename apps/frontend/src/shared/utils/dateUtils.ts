function ensureDate(date: Date | string) {
  return date instanceof Date ? date : new Date(date);
}

export const formatDateTime = (date: Date | string): string => {
  const realDate = ensureDate(date);

  // Check if the date is valid
  if (isNaN(realDate.getTime())) return 'Invalid date';

  return realDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (date: Date | string): string => {
  const realDate = ensureDate(date);

  // Check if the date is valid
  if (isNaN(realDate.getTime())) return 'Invalid date';

  return realDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const formatDuration = (updatedAt: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - updatedAt.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};
