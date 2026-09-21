import { Space } from '@packmind/types';
import {
  FullParsedPackageSlug,
  isFullParsedPackageSlug,
  ParsedPackageSlug,
} from '../../../domain/entities/PackageSlug';
import { logErrorConsole, logInfoConsole } from '../../utils/consoleLogger';
import { EXEC_NAME } from '../../utils/execName';

/**
 * Turns the `--to` / `--from` package reference into a space-qualified one.
 *
 * A bare `my-package` is only unambiguous when the organization has a single
 * space, so with several the user is asked to qualify it rather than having one
 * picked for them. Exits instead of throwing: every caller is a handler that
 * would do nothing else with the failure.
 */
export function resolvePackageRef(
  ref: ParsedPackageSlug,
  allSpaces: Space[],
  exit: (code: number) => void,
  flag: '--to' | '--from',
): FullParsedPackageSlug {
  if (isFullParsedPackageSlug(ref)) {
    const spaceExists = allSpaces.find((s) => s.slug === ref.spaceSlug);
    if (!spaceExists) {
      logErrorConsole(`Space '${ref.spaceSlug}' not found.`);
      const availableSpaceSlugs = allSpaces.map((s) => `@${s.slug}`).join(', ');
      logInfoConsole(`Available spaces: ${availableSpaceSlugs}`);
      exit(1);
    }
    return ref;
  }

  if (allSpaces.length > 1) {
    logErrorConsole(
      `Your organization has multiple spaces. Please specify the space using the @space/package format.`,
    );
    logInfoConsole(`For example:`);
    allSpaces.forEach((s) => {
      logInfoConsole(`  ${flag} @${s.slug}/${ref.packageSlug}`);
    });
    logInfoConsole(
      `Run \`${EXEC_NAME} packages list\` to see available packages per space.`,
    );
    exit(1);
  }

  return { ...ref, spaceSlug: allSpaces[0].slug };
}
