import { IPublicUseCase } from '../../UseCase';

export type ExchangeCliLoginCodeCommand = {
  code: string;
};

export type ExchangeCliLoginCodeResponse = {
  apiKey: string;
  expiresAt: Date;
};

export type IExchangeCliLoginCodeUseCase = IPublicUseCase<
  ExchangeCliLoginCodeCommand,
  ExchangeCliLoginCodeResponse
>;
