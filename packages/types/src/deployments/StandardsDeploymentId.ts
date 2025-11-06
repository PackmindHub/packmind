import { Branded, brandedIdFactory } from '../brandedTypes';

export type StandardsDeploymentId = Branded<'StandardDeploymentId'>;
export const createStandardsDeploymentId =
  brandedIdFactory<StandardsDeploymentId>();
