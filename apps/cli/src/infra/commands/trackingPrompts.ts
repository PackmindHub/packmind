import * as inquirer from 'inquirer';
import { TrackRepositoryConfirmation } from '../../domain/useCases/trackRepository/ITrackRepositoryUseCase';

export type ConfirmPromptFn = (message: string) => Promise<boolean>;

/**
 * Builds the confirmation message shown to the user for a tracking operation.
 * Shared between the `track` command and the `init` prompt so both surfaces
 * use identical copy.
 */
function buildTrackConfirmationMessage(
  details: TrackRepositoryConfirmation,
): string {
  if (details.mode === 'remove') {
    // The branch is context, not scope: removal is keyed on the repository and
    // takes whatever branch is tracked. Phrasing it as "… on branch X" read as
    // though only that branch were affected.
    return `Stop tracking ${details.owner}/${details.repo}? Packmind currently tracks branch ${details.branch}.`;
  }
  if (details.mode === 'update') {
    return `Change the tracked branch for ${details.owner}/${details.repo} from ${details.fromBranch} to ${details.branch}?`;
  }
  return `Track ${details.owner}/${details.repo} on branch ${details.branch}?`;
}

/**
 * Default inquirer-backed confirmation prompt.
 *
 * Defaults to **cancel** (`y/N`). Every operation behind this prompt changes
 * which branch governs the repository, so a bare Enter — from the wrong branch,
 * or from someone skimming the onboarding flow — must not be enough to make a
 * throwaway branch the organization's governance policy. The caller has to
 * type `y`.
 */
export async function defaultConfirmPrompt(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.default.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);
  return confirmed;
}

/**
 * Creates the `confirm` callback passed to the TrackRepositoryUseCase. When not
 * running interactively (no TTY) the operation is confirmed automatically since
 * the user explicitly invoked the command. Callers that must not act without a
 * prompt (e.g. `init`) only invoke this when a TTY is present.
 */
export function createTrackConfirm(options: {
  isTTY: boolean;
  confirmPrompt?: ConfirmPromptFn;
}): (details: TrackRepositoryConfirmation) => Promise<boolean> {
  const confirmPrompt = options.confirmPrompt ?? defaultConfirmPrompt;
  return async (details) => {
    if (!options.isTTY) {
      return true;
    }
    return confirmPrompt(buildTrackConfirmationMessage(details));
  };
}
