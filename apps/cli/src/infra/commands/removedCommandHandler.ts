import { HelpMessage } from '../../domain/repositories/IOutput';

export type NotifyErrorFunction = (message: string, help?: HelpMessage) => void;

export interface RemovedTrackHandlerDependencies {
  /** Flags the user passed to the removed command, forwarded to the advice. */
  update: boolean;
  branch?: string;
  remove: boolean;
  notifyError: NotifyErrorFunction;
}

export interface RemovedUntrackHandlerDependencies {
  notifyError: NotifyErrorFunction;
}

/**
 * Handlers for the removed `track` and `untrack` commands. They exist only to
 * name the replacement: `git track` and `git untrack` cover every case the old
 * spellings did, so nothing is forwarded and both exit 1.
 */
function reportRemovedCommand(
  notifyError: NotifyErrorFunction,
  removedCommand: string,
  replacementCommand: string,
  carriedFlags: string[] = [],
): void {
  notifyError(`Command "packmind ${removedCommand}" has been removed.`, {
    content: `Use the "${replacementCommand}" command instead:`,
    exampleCommand: [`packmind ${replacementCommand}`, ...carriedFlags].join(
      ' ',
    ),
  });
}

export function removedTrackHandler(
  deps: RemovedTrackHandlerDependencies,
): void {
  // Removal moved to its own command, so `--remove` has a different
  // replacement from every other spelling of `track`.
  if (deps.remove) {
    reportRemovedCommand(deps.notifyError, 'track --remove', 'git untrack');
    process.exit(1);
    return;
  }

  const carriedFlags: string[] = [];
  if (deps.update) {
    carriedFlags.push('--update');
  }
  if (deps.branch) {
    carriedFlags.push(`--branch ${deps.branch}`);
  }

  reportRemovedCommand(deps.notifyError, 'track', 'git track', carriedFlags);
  process.exit(1);
}

export function removedUntrackHandler(
  deps: RemovedUntrackHandlerDependencies,
): void {
  reportRemovedCommand(deps.notifyError, 'untrack', 'git untrack');
  process.exit(1);
}
