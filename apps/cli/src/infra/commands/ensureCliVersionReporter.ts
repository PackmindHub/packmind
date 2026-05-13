import { EnsureCliVersionOutcome } from '../../domain/useCases/IEnsureCliVersionUseCase';
import { logInfoConsole, logWarningConsole } from '../utils/consoleLogger';

/**
 * Maps the {@link EnsureCliVersionOutcome} returned by `EnsureCliVersionUseCase`
 * onto user-visible console output, following the spec:
 * - `older` → warn the user to update.
 * - `newer` → info: CLI upgrade detected (default skills are refreshed by the
 *   use case itself).
 * - `match`, `no-lockfile`, `no-cli-version-recorded` → silent.
 */
export function reportEnsureCliVersionOutcome(
  outcome: EnsureCliVersionOutcome,
  currentCliVersion: string,
): void {
  switch (outcome.kind) {
    case 'older':
      logWarningConsole(
        `[packmind-cli] Your CLI version ${currentCliVersion} is older than the version recorded in packmind-lock.json (${outcome.lockVersion}). Please update your CLI.`,
      );
      break;
    case 'newer':
      logInfoConsole(
        '[packmind-cli] CLI upgrade detected — refreshing default skills.',
      );
      break;
    case 'match':
    case 'no-lockfile':
    case 'no-cli-version-recorded':
      // Intentionally silent.
      break;
  }
}
