import { IPublicUseCase } from '@packmind/types';

export interface ICreatePackageCommand {
  name: string;
  description?: string;
  originSkill?: string;
  spaceSlug?: string;
}

export interface ICreatePackageResult {
  packageId: string;
  name: string;
  slug: string;
  spaceSlug: string;
}

export type ICreatePackageUseCase = IPublicUseCase<
  ICreatePackageCommand,
  ICreatePackageResult
>;
