import { IStartTrial, PublicGateway } from '@packmind/types';

export interface GetActivationTokenCommand {
  trialToken: string;
}

export interface GetActivationTokenResponse {
  activationUrl: string;
}

export interface ITrialGateway {
  startTrial: PublicGateway<IStartTrial>;
  getActivationToken: (
    command: GetActivationTokenCommand,
  ) => Promise<GetActivationTokenResponse>;
}
