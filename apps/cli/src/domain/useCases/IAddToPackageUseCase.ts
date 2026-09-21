import { IPublicUseCase } from '@packmind/types';
import { ItemType } from '../entities/ItemType';

export type { ItemType };

export interface IAddToPackageCommand {
  packageSlug: string;
  spaceSlug?: string;
  itemType: ItemType;
  itemSlugs: string[];
  originSkill?: string;
}

export interface IAddToPackageResult {
  added: string[];
  skipped: string[];
}

export type IAddToPackageUseCase = IPublicUseCase<
  IAddToPackageCommand,
  IAddToPackageResult
>;
