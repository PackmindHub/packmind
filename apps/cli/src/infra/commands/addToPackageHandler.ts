import {
  IAddToPackageUseCase,
  ItemType,
} from '../../domain/useCases/IAddToPackageUseCase';
import {
  logWarningConsole,
  logErrorConsole,
  logSuccessConsole,
} from '../utils/consoleLogger';

function pluralize(singular: string, count: number) {
  return count === 1 ? singular : `${singular}s`;
}

function formatItemType(itemType: ItemType, count: number): string {
  return pluralize(itemType.charAt(0).toUpperCase() + itemType.slice(1), count);
}

function formatItemList(items: string[]): string {
  return items.map((item) => `"${item}"`).join(', ');
}

export interface IAddToPackageHandlerResult {
  success: boolean;
  added?: string[];
  skipped?: string[];
  error?: string;
}

export async function addToPackageHandler(
  packageSlug: string,
  itemType: ItemType,
  itemSlugs: string[],
  useCase: IAddToPackageUseCase,
): Promise<IAddToPackageHandlerResult> {
  if (itemSlugs.length === 0) {
    return { success: false, error: 'No items provided to add' };
  }

  try {
    const result = await useCase.execute({ packageSlug, itemType, itemSlugs });

    if (result.added.length) {
      logSuccessConsole(
        `${formatItemType(itemType, result.added.length)} ${formatItemList(result.added)} added to "${packageSlug}"`,
      );
      logSuccessConsole(
        `Run \`packmind-cli install ${packageSlug}\` to install the ${pluralize(itemType, result.added.length)}`,
      );
    }

    if (result.skipped.length) {
      logWarningConsole(
        `${formatItemType(itemType, result.skipped.length)} ${formatItemList(result.skipped)} already in "${packageSlug}" (skipped)`,
      );
    }

    return { success: true, added: result.added, skipped: result.skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logErrorConsole(message);
    return { success: false, error: message };
  }
}
