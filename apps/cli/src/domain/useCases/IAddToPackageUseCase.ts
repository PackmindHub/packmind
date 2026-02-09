export type ItemType = 'standard' | 'command' | 'skill';

export interface IAddToPackageCommand {
  packageSlug: string;
  itemType: ItemType;
  itemSlugs: string[];
  originSkill?: string;
}

export interface IAddToPackageResult {
  added: string[];
  skipped: string[];
}

export interface IAddToPackageUseCase {
  execute(command: IAddToPackageCommand): Promise<IAddToPackageResult>;
}
