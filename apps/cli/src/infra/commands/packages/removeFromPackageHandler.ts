import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { RemoveFromPackageUseCase } from '../../../application/useCases/RemoveFromPackageUseCase';
import {
  logConsole,
  logErrorConsole,
  logSuccessConsole,
} from '../../utils/consoleLogger';
import { ItemType } from '../../../domain/entities/ItemType';
import { IRemovedArtefact } from '../../../domain/useCases/IRemoveFromPackageUseCase';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import { ParsedPackageSlug } from '../../../domain/entities/PackageSlug';
import { resolvePackageRef } from './resolvePackageRef';
import {
  artefactSubject,
  logItemNotFoundHint,
  logPackageList,
} from './packageMembershipOutput';

export type RemoveFromPackageHandlerArgs = {
  from: ParsedPackageSlug;
  itemType: ItemType;
  itemSlugs: string[];
};

export type RemoveFromPackageHandlerDeps = {
  hexa: Pick<
    PackmindCliHexa,
    'getSpaces' | 'getPackmindGateway' | 'getSpaceService'
  >;
  exit: (code: number) => void;
};

/**
 * Narrates one artefact's removal, always ending on where it still lives: an
 * artefact left in no package at all is no longer installed anywhere, which the
 * user should hear rather than infer.
 */
function logRemovedArtefact(
  itemType: ItemType,
  packageSlug: string,
  removed: IRemovedArtefact,
): void {
  const subject = artefactSubject(itemType, removed.name);

  if (!removed.removed) {
    logConsole(
      `${subject} is not in package "${packageSlug}", nothing changed`,
    );
    return;
  }

  logSuccessConsole(
    `${subject} has been removed from package "${packageSlug}"`,
  );

  if (removed.remainingPackageSlugs.length === 0) {
    logConsole('It does not belong to any package anymore');
    return;
  }

  logPackageList(
    {
      one: 'It still belongs to package',
      many: 'It still belongs to the following packages',
    },
    removed.remainingPackageSlugs,
  );
}

export async function removeFromPackageHandler(
  args: RemoveFromPackageHandlerArgs,
  deps: RemoveFromPackageHandlerDeps,
): Promise<void> {
  const { hexa, exit } = deps;

  if (args.itemSlugs.length === 0) {
    logErrorConsole('No items provided to remove');
    exit(1);
    return;
  }

  const allSpaces = await hexa.getSpaces();
  const { packageSlug, spaceSlug } = resolvePackageRef(
    args.from,
    allSpaces,
    exit,
    '--from',
  );

  const useCase = new RemoveFromPackageUseCase(
    hexa.getPackmindGateway(),
    hexa.getSpaceService(),
  );

  try {
    const result = await useCase.execute({
      packageSlug,
      spaceSlug,
      itemType: args.itemType,
      itemSlugs: args.itemSlugs,
    });

    result.removed.forEach((removed) =>
      logRemovedArtefact(args.itemType, result.packageSlug, removed),
    );
  } catch (error) {
    logErrorConsole(error instanceof Error ? error.message : String(error));
    if (error instanceof ItemNotFoundError) {
      logItemNotFoundHint(error);
    }
    exit(1);
  }
}
