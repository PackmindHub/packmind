import { Branded, brandedIdFactory } from '../brandedTypes';

export type DistributedPackageId = Branded<'DistributedPackageId'>;
export const createDistributedPackageId =
  brandedIdFactory<DistributedPackageId>();
