import {
  logInfoConsole,
  logSuccessConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { AddGitConnectionInput } from '../../../domain/repositories/IGitGateway';

export type AddGitConnectionHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  input: AddGitConnectionInput;
  exit: (code: number) => void;
};

export async function addGitConnectionHandler(
  deps: AddGitConnectionHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, input, exit } = deps;

  try {
    logInfoConsole(
      `Adding ${input.source} connection "${input.displayName}"...`,
    );
    const provider = await packmindCliHexa.addGitConnection(input);

    logSuccessConsole(
      `Git connection created: ${provider.displayName || provider.source} (${provider.id})`,
    );
    exit(0);
  } catch (err) {
    logErrorConsole('Failed to add git connection:');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    exit(1);
  }
}
