import { Space } from '@packmind/types';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { AddToPackageUseCase } from '../../../application/useCases/AddToPackageUseCase';
import {
  logWarningConsole,
  logErrorConsole,
  logSuccessConsole,
  logInfoConsole,
  formatCommand,
} from '../../utils/consoleLogger';
import {
  IAddToPackageUseCase,
  ItemType,
} from '../../../domain/useCases/IAddToPackageUseCase';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IAddToPackageHandlerResult {
  success: boolean;
  added?: string[];
  skipped?: string[];
  error?: string;
}

export type AddToPackageHandlerArgs = {
  to: string;
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

function formatItemType(itemType: ItemType, count: number): string {
  return pluralize(itemType.charAt(0).toUpperCase() + itemType.slice(1), count);
}

function formatItemList(items: string[]): string {
  return items.map((item) => `"${item}"`).join(', ');
}

function parsePackageSlug(
  slug: string,
): { spaceSlug: string; pkgSlug: string } | null {
  if (!slug.startsWith('@')) return null;
  const slash = slug.indexOf('/', 1);
  if (slash === -1) return null;
  return { spaceSlug: slug.slice(1, slash), pkgSlug: slug.slice(slash + 1) };
}

function resolvePackageRef(
  to: string,
  allSpaces: Space[],
  exit: (code: number) => void,
): { pkgSlug: string; spaceSlug: string } {
  const parsed = parsePackageSlug(to);

  if (parsed) {
    const spaceExists = allSpaces.find((s) => s.slug === parsed.spaceSlug);
    if (!spaceExists) {
      logErrorConsole(`Space '${parsed.spaceSlug}' not found.`);
      logInfoConsole(
        `Available spaces: ${allSpaces.map((s) => `@${s.slug}`).join(', ')}`,
      );
      exit(1);
    }
    return parsed;
  }

  if (allSpaces.length > 1) {
    logErrorConsole(
      `Your organization has multiple spaces. Please specify the space using the @space/package format.`,
    );
    logInfoConsole(`For example:`);
    allSpaces.forEach((s) => {
      logInfoConsole(`  --to @${s.slug}/${to}`);
    });
    logInfoConsole(
      `Run \`packmind packages list\` to see available packages per space.`,
    );
    exit(1);
  }

  return { pkgSlug: to, spaceSlug: allSpaces[0].slug };
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
        `Run ${formatCommand(`packmind install ${fullPackageSlug}`)} to install the ${pluralize(itemType, result.added.length)}`,
      );
    }

    if (result.skipped.length) {
      logWarningConsole(
        `${formatItemType(itemType, result.skipped.length)} ${formatItemList(result.skipped)} already in "@${spaceSlug}/${pkgSlug}" (skipped)`,
      );
    }

    return { success: true, added: result.added, skipped: result.skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logErrorConsole(message);
    if (error instanceof ItemNotFoundError) {
      const spaceFlag = error.spaceSlug ? ` --space ${error.spaceSlug}` : '';
      const command = formatCommand(
        `packmind ${error.itemType}s list${spaceFlag}`,
      );

      logInfoConsole(
        `Run \`${command}\` to display available ${error.itemType}s`,
      );
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
  const { pkgSlug, spaceSlug } = resolvePackageRef(args.to, allSpaces, exit);

  const gateway = hexa.getPackmindGateway();
  const useCase = new AddToPackageUseCase(gateway, hexa.getSpaceService());

  const result = await executeAddToPackage(
    pkgSlug,
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
