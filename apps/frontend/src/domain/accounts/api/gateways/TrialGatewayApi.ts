import { StartTrialCommand, StartTrialResult } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import {
  GetActivationTokenCommand,
  GetActivationTokenResponse,
  ITrialGateway,
} from './ITrialGateway';

export class TrialGatewayApi extends PackmindGateway implements ITrialGateway {
  constructor() {
    super('/');
  }

  startTrial = async (params: StartTrialCommand): Promise<StartTrialResult> => {
    return this._api.get<StartTrialResult>(
      `${this._endpoint}start-trial?agent=${params.agent}`,
    );
  };

  getActivationToken = async (
    command: GetActivationTokenCommand,
  ): Promise<GetActivationTokenResponse> => {
    return this._api.post<GetActivationTokenResponse>(
      `${this._endpoint}start-trial/get-activation-token`,
      command,
    );
  };
}
