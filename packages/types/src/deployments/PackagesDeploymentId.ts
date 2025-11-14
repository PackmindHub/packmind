import { Branded, brandedIdFactory } from '../brandedTypes';

export type PackagesDeploymentId = Branded<'PackagesDeploymentId'>;
export const createPackagesDeploymentId =
  brandedIdFactory<PackagesDeploymentId>();
