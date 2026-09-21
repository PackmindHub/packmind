import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { MoveToPackageUseCase } from '../../../application/useCases/MoveToPackageUseCase';
import {
  formatCommand,
  logConsole,
  logErrorConsole,
  logSuccessConsole,
} from '../../utils/consoleLogger';
import { ItemType } from '../../../domain/entities/ItemType';
import { IMovedArtefact } from '../../../domain/useCases/IMoveToPackageUseCase';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import { ParsedPackageSlug } from '../../../domain/entities/PackageSlug';
import { EXEC_NAME } from '../../utils/execName';
import { resolvePackageRef } from './resolvePackageRef';
import {
  artefactSubject,
  logItemNotFoundHint,
  logPackageList,
} from './packageMembershipOutput';

export type MoveToPackageHandlerArgs = {
  to: ParsedPackageSlug;
  itemType: ItemType;
  itemSlugs: string[];
  originSkill?: string;
};

export type MoveToPackageHandlerDeps = {
  hexa: Pick<
    PackmindCliHexa,
    'getSpaces' | 'getPackmindGateway' | 'getSpaceService'
  >;
  exit: (code: number) => void;
};

/**
 * Narrates one artefact's move: where it landed, and everywhere it was taken
 * out of. An artefact already in the target and nowhere else moved nothing, and
 * says so rather than claiming an addition that did not happen.
 */
function logMovedArtefact(
  itemType: ItemType,
  targetPackageSlug: string,
  moved: IMovedArtefact,
): void {
  const subject = artefactSubject(itemType, moved.name);

  if (moved.addedToTarget) {
    logSuccessConsole(
      `${subject} has been added to package "${targetPackageSlug}"`,
    );
  } else if (moved.removedFrom.length === 0) {
    logConsole(
      `${subject} is already in package "${targetPackageSlug}", nothing changed`,
    );
    return;
  } else {
    logConsole(`${subject} is already in package "${targetPackageSlug}"`);
  }

  if (moved.removedFrom.length > 0) {
    logPackageList(
      {
        one: 'It has been removed from',
        many: 'It has been removed from the following packages',
      },
      moved.removedFrom,
    );
  }
}

export async function moveToPackageHandler(
  args: MoveToPackageHandlerArgs,
  deps: MoveToPackageHandlerDeps,
): Promise<void> {
  const { hexa, exit } = deps;

  if (args.itemSlugs.length === 0) {
    logErrorConsole('No items provided to move');
    exit(1);
    return;
  }

  const allSpaces = await hexa.getSpaces();
  const { packageSlug, spaceSlug } = resolvePackageRef(
    args.to,
    allSpaces,
    exit,
    '--to',
  );

  const useCase = new MoveToPackageUseCase(
    hexa.getPackmindGateway(),
    hexa.getSpaceService(),
  );

  try {
    const result = await useCase.execute({
      packageSlug,
      spaceSlug,
      itemType: args.itemType,
      itemSlugs: args.itemSlugs,
      originSkill: args.originSkill,
    });

    result.moved.forEach((moved) =>
      logMovedArtefact(args.itemType, result.targetPackageSlug, moved),
    );

    if (result.moved.some((moved) => moved.addedToTarget)) {
      logSuccessConsole(
        `Run ${formatCommand(`${EXEC_NAME} install ${result.targetPackageSlug}`)} to install the changes`,
      );
    }
  } catch (error) {
    logErrorConsole(error instanceof Error ? error.message : String(error));
    if (error instanceof ItemNotFoundError) {
      logItemNotFoundHint(error);
    }
    exit(1);
  }
}
