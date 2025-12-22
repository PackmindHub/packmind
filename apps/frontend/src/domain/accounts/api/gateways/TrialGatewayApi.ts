import { StartTrialCommand, StartTrialResult } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ITrialGateway } from './ITrialGateway';

export class TrialGatewayApi extends PackmindGateway implements ITrialGateway {
  constructor() {
    super('/');
  }

  startTrial = async (params: StartTrialCommand): Promise<StartTrialResult> => {
    return this._api.get<StartTrialResult>(
      `${this._endpoint}start-trial?agent=${params.agent}`,
    );
  };
}
