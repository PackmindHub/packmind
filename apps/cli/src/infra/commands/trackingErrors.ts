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
    // Not a kill-switch, whatever this branch used to claim: no feature flag
    // gates these routes. A server that has them maps refusals to 403 or 409,
    // so a 404 means the server predates repository tracking — nothing to do
    // with the account the old message blamed.
    logErrorConsole(
      'Repository tracking is not available on this Packmind server. Ask your administrator to update it.',
    );
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
