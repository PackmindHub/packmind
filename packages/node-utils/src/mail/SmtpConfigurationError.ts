/**
 * Error thrown when the SMTP environment configuration cannot be turned into a
 * transport: a missing host or port, or a setting whose value is not understood.
 *
 * Distinct from a delivery failure so callers can tell "this instance is
 * misconfigured" from "this particular message could not be sent".
 */
export class SmtpConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmtpConfigurationError';
  }
}
