import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import { logErrorConsole } from '../utils/consoleLogger';

/**
 * Shared failure reporting for the `track` and `untrack` commands. Both talk to
 * the same routes, so they must fail the same way.
 */
export function handleTrackingError(error: unknown): void {
  if (error instanceof NotLoggedInError) {
    logErrorConsole(error.message);
    process.exit(1);
    return;
  }

  const statusCode = (error as { statusCode?: number })?.statusCode;
  if (statusCode === 404) {
    // Kill-switch: the feature flag is off for this user. Behave as feature-absent.
    logErrorConsole('Repository tracking is not available for your account.');
    process.exit(1);
    return;
  }

  if (statusCode === 403) {
    // The server's OrganizationAdminRequiredError message names the user and the
    // organization by UUID, which tells a CLI user nothing they can act on.
    // Replace it with something actionable; the ids stay in the server logs.
    logErrorConsole(
      'Only organization admins can change which repository Packmind tracks. Ask an admin of your organization to run this command.',
    );
    process.exit(1);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  logErrorConsole(message);
  process.exit(1);
}
