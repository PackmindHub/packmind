/**
 * Masks an email address for logging purposes to comply with data protection regulations.
 * Returns "***@***" to completely anonymize the email.
 *
 * @param _email - The email address to mask (intentionally unused as all emails are masked the same way)
 * @returns The masked email address ("***@***")
 *
 * @example
 * maskEmail('john.doe@example.com') // returns '***@***'
 * maskEmail('test@example.com') // returns '***@***'
 * maskEmail('abc') // returns '***@***'
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function maskEmail(_email: string | undefined | null): string {
  return '***@***';
}
