import * as inquirer from 'inquirer';
import { TrackRepositoryConfirmation } from '../../domain/useCases/trackRepository/ITrackRepositoryUseCase';

export type ConfirmPromptFn = (message: string) => Promise<boolean>;

/**
 * Builds the confirmation message shown to the user for a tracking operation.
 * Shared between the `track` command and the `init` prompt so both surfaces
 * use identical copy.
 */
export function buildTrackConfirmationMessage(
  details: TrackRepositoryConfirmation,
): string {
  if (details.mode === 'update') {
    return `Change the tracked branch for ${details.owner}/${details.repo} from ${details.fromBranch} to ${details.branch}?`;
  }
  return `Track ${details.owner}/${details.repo} on branch ${details.branch}?`;
}

/**
 * Default inquirer-backed confirmation prompt.
 */
export async function defaultConfirmPrompt(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.default.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: true,
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
