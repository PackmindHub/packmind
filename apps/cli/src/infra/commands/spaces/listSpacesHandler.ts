import { Space } from '@packmind/types';
import {
  logConsole,
  logInfoConsole,
  logErrorConsole,
  formatSlug,
  formatLabel,
} from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';

export type ListSpacesHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

function displaySpace(space: Space): void {
  logConsole(`- ${formatSlug(`@${space.slug}`)}`);
  logConsole(`    ${formatLabel('Name:')} ${space.name}`);
  logConsole('');
}

export async function listSpacesHandler(
  deps: ListSpacesHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    logInfoConsole('Fetching available spaces...');
    const spaces = await packmindCliHexa.getSpaces();

    if (!spaces || spaces.length === 0) {
      logConsole('No spaces found.');
      exit(0);
      return;
    }

    logConsole('\nAvailable spaces:\n');
    const sorted = [...spaces].sort((a, b) => a.name.localeCompare(b.name));
    for (const space of sorted) {
      displaySpace(space);
    }

    exit(0);
  } catch (err) {
    logErrorConsole('Failed to list spaces:');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    exit(1);
  }
}
