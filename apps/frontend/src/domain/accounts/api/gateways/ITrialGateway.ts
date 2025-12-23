import { IStartTrial, PublicGateway } from '@packmind/types';

export interface GetActivationTokenCommand {
  mcpToken: string;
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
