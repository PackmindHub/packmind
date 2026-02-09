import { IPublicUseCase } from '@packmind/types';

export interface ICreatePackageCommand {
  name: string;
  description?: string;
  originSkill?: string;
}

export interface ICreatePackageResult {
  packageId: string;
  name: string;
  slug: string;
}

export type ICreatePackageUseCase = IPublicUseCase<
  ICreatePackageCommand,
  ICreatePackageResult
>;
