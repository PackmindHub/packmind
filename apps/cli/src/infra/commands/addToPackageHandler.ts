import {
  IAddToPackageUseCase,
  ItemType,
} from '../../domain/useCases/IAddToPackageUseCase';
import {
  logConsole,
  logWarningConsole,
  logErrorConsole,
} from '../utils/consoleLogger';

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

    for (const item of result.added) {
      logConsole(`Added ${item} to ${packageSlug}`);
    }
    for (const item of result.skipped) {
      logWarningConsole(`${item} already in ${packageSlug} (skipped)`);
    }

    return { success: true, added: result.added, skipped: result.skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logErrorConsole(message);
    return { success: false, error: message };
  }
}
