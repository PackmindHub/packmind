import { packmindApiService } from '../services/api/PackmindApiService';
import { ApiService } from '../services/api/ApiService';

export abstract class PackmindGateway {
  protected readonly _api: ApiService;
  protected readonly _endpoint: string;

  protected constructor(
    endpoint: string,
    api: ApiService = packmindApiService,
  ) {
    this._api = api;
    this._endpoint = endpoint;
  }

  protected getFullEndpoint(): string {
    return `${this._api.baseApiUrl}${this._endpoint}`;
  }
}
