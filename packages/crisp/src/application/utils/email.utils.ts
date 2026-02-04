/**
 * Determines if an email is a trial account email.
 * Trial emails follow the pattern: trial-{uuid}@packmind.trial
 *
 * @param email - The email address to check
 * @returns true if the email is a trial email, false otherwise
 */
export function isTrialEmail(email: string): boolean {
  return email.startsWith('trial-');
}
