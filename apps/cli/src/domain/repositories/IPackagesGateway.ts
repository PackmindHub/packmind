import { PublicGateway } from '@packmind/types';
import { IListPackagesUseCase } from '../useCases/IListPackagesUseCase';
import { IGetPackageSummaryUseCase } from '../useCases/IGetPackageSummaryUseCase';

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

export interface IPackagesGateway {
  list: PublicGateway<IListPackagesUseCase>;
  getSummary: PublicGateway<IGetPackageSummaryUseCase>;
  create(
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult>;
}
