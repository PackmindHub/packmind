import { IStartTrial, PublicGateway } from '@packmind/types';

export interface ITrialGateway {
  startTrial: PublicGateway<IStartTrial>;
}
