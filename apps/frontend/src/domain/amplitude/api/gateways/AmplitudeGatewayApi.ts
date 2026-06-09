import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { AmplitudeConfig, IAmplitudeGateway } from './IAmplitudeGateway';

export class AmplitudeGatewayApi
  extends PackmindGateway
  implements IAmplitudeGateway
{
  constructor() {
    super('/amplitude');
  }

  getProxyUrl(): string {
    return `${this.getFullEndpoint()}/collect`;
  }

  async getConfig(): Promise<AmplitudeConfig> {
    return this._api.get<AmplitudeConfig>(`${this._endpoint}/config`);
  }
}
