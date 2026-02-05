import {
  Gateway,
  IListPackagesUseCase,
  IGetPackageSummaryUseCase,
} from '@packmind/types';

// Create package types
export type CreatePackageCommand = {
  name: string;
  description?: string;
};

export type CreatePackageResult = {
  id: string;
  name: string;
  slug: string;
};

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
  create(
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult>;
  addArtefacts(
    command: AddArtefactsToPackageCommand,
  ): Promise<AddArtefactsToPackageResult>;
}
