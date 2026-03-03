/**
 * Get the Packmind instance URL from environment variable or default.
 *
 * @returns The base URL for the Packmind API instance
 */
export function getPackmindInstanceUrl(): string {
  return process.env['PACKMIND_INSTANCE_URL'] || 'http://localhost:4200';
}
