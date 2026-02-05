import {
  Gateway,
  IListPackagesUseCase,
  IGetPackageSummaryUseCase,
  ICreatePackageUseCase,
} from '@packmind/types';

// Add artefacts to package types
export type AddArtefactsToPackageCommand = {
  packageSlug: string;
  spaceId: string;
  standardIds?: string[];
  commandIds?: string[];
  skillIds?: string[];
};

export type AddArtefactsToPackageResult = {
  added: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
  skipped: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
};

export interface IPackagesGateway {
  list: Gateway<IListPackagesUseCase>;
  getSummary: Gateway<IGetPackageSummaryUseCase>;
  create: Gateway<ICreatePackageUseCase>;
  addArtefacts(
    command: AddArtefactsToPackageCommand,
  ): Promise<AddArtefactsToPackageResult>;
}
