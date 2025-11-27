import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProviderMetadata } from '../LLMProviderMetadata';

export type GetAvailableProvidersCommand = PackmindCommand;

export type GetAvailableProvidersResponse = {
  providers: ProviderMetadata[];
};

export type IGetAvailableProvidersUseCase = IUseCase<
  GetAvailableProvidersCommand,
  GetAvailableProvidersResponse
>;
