import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { AddToPackageUseCase } from '../../../application/useCases/AddToPackageUseCase';
import {
  logWarningConsole,
  logErrorConsole,
  logSuccessConsole,
  logInfoConsole,
  logConsole,
  formatCommand,
} from '../../utils/consoleLogger';
import { IAddToPackageUseCase } from '../../../domain/useCases/IAddToPackageUseCase';
import { ItemType, formatItemType } from '../../../domain/entities/ItemType';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import { ArtefactAlreadyInPackageError } from '../../../domain/errors/ArtefactAlreadyInPackageError';
import { ParsedPackageSlug } from '../../../domain/entities/PackageSlug';
import { EXEC_NAME } from '../../utils/execName';
import { resolvePackageRef } from './resolvePackageRef';
import {
  artefactSubject,
  logItemNotFoundHint,
  logPackageList,
} from './packageMembershipOutput';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IAddToPackageHandlerResult {
  success: boolean;
  added?: string[];
  skipped?: string[];
  error?: string;
}

export type AddToPackageHandlerArgs = {
  to: ParsedPackageSlug;
  itemType: ItemType;
  itemSlugs: string[];
  originSkill?: string;
};

export type AddToPackageHandlerDeps = {
  hexa: Pick<
    PackmindCliHexa,
    'getSpaces' | 'getPackmindGateway' | 'getSpaceService'
  >;
  exit: (code: number) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pluralize(singular: string, count: number) {
  return count === 1 ? singular : `${singular}s`;
}

function formatItemList(items: string[]): string {
  return items.map((item) => `"${item}"`).join(', ');
}

/**
 * Reports the artefacts that already live elsewhere and hands over the `move`
 * command that would relocate them, since `add` deliberately refuses to.
 */
function logAlreadyInPackage(error: ArtefactAlreadyInPackageError): void {
  error.conflicts.forEach((conflict) => {
    const subject = artefactSubject(error.itemType, conflict.name);
    logPackageList(
      {
        one: `${subject} already belongs to package`,
        many: `${subject} already belongs to the following packages`,
      },
      conflict.packageSlugs,
    );
  });

  logConsole('');

  const slugFlags = error.conflicts
    .map((conflict) => `--${error.itemType} ${conflict.slug}`)
    .join(' ');
  const moveCommand = formatCommand(
    `${EXEC_NAME} packages move ${slugFlags} --to ${error.targetPackageSlug}`,
  );
  logInfoConsole(
    `Run \`${moveCommand}\` to move the ${pluralize(error.itemType, error.conflicts.length)}.`,
  );
}

// ─── Use-case invocation ──────────────────────────────────────────────────────

async function executeAddToPackage(
  pkgSlug: string,
  spaceSlug: string,
  itemType: ItemType,
  itemSlugs: string[],
  useCase: IAddToPackageUseCase,
  originSkill?: string,
): Promise<IAddToPackageHandlerResult> {
  if (itemSlugs.length === 0) {
    return { success: false, error: 'No items provided to add' };
  }

  try {
    const result = await useCase.execute({
      packageSlug: pkgSlug,
      spaceSlug,
      itemType,
      itemSlugs,
      originSkill,
    });

    if (result.added.length) {
      const fullPackageSlug = `@${spaceSlug}/${pkgSlug}`;
      logSuccessConsole(
        `${formatItemType(itemType, result.added.length)} ${formatItemList(result.added)} added to "${fullPackageSlug}"`,
      );
      logSuccessConsole(
        `Run ${formatCommand(`${EXEC_NAME} install ${fullPackageSlug}`)} to install the ${pluralize(itemType, result.added.length)}`,
      );
    }

    if (result.skipped.length) {
      logWarningConsole(
        `${formatItemType(itemType, result.skipped.length)} ${formatItemList(result.skipped)} already in "@${spaceSlug}/${pkgSlug}" (skipped)`,
      );
    }

    return { success: true, added: result.added, skipped: result.skipped };
  } catch (error) {
    if (error instanceof ArtefactAlreadyInPackageError) {
      logAlreadyInPackage(error);
      return { success: false, error: error.message };
    }

    const message = error instanceof Error ? error.message : String(error);
    logErrorConsole(message);
    if (error instanceof ItemNotFoundError) {
      logItemNotFoundHint(error);
    }
    return { success: false, error: message };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function addToPackageHandler(
  args: AddToPackageHandlerArgs,
  deps: AddToPackageHandlerDeps,
): Promise<void> {
  const { hexa, exit } = deps;

  const allSpaces = await hexa.getSpaces();
  const { packageSlug, spaceSlug } = resolvePackageRef(
    args.to,
    allSpaces,
    exit,
    '--to',
  );

  const gateway = hexa.getPackmindGateway();
  const useCase = new AddToPackageUseCase(gateway, hexa.getSpaceService());

  const result = await executeAddToPackage(
    packageSlug,
    spaceSlug,
    args.itemType,
    args.itemSlugs,
    useCase,
    args.originSkill,
  );

  if (!result.success) {
    exit(1);
  }
}
