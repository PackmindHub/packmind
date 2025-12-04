/**
 * Error thrown when the user is not logged in to Packmind.
 * This error should be caught and handled with a user-friendly message.
 */
export class NotLoggedInError extends Error {
  constructor() {
    super(
      "You're not logged in to Packmind. Please either use the login command or set the PACKMIND_API_KEY_V3 environment variable (from the Settings menu in Packmind).",
    );
    this.name = 'NotLoggedInError';
  }
}
