import { Branded, brandedIdFactory } from '../brandedTypes';

export type DistributionId = Branded<'DistributionId'>;
export const createDistributionId = brandedIdFactory<DistributionId>();
