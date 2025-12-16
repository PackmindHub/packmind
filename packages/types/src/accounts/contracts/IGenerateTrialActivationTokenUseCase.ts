import { IUseCase, PackmindCommand } from '../../UseCase';
import { TrialActivationToken } from '../TrialActivationToken';

export type GenerateTrialActivationTokenCommand = PackmindCommand;
export type GenerateTrialActivationTokenResult = {
  activationToken: TrialActivationToken;
};

export type IGenerateTrialActivationTokenUseCase = IUseCase<
  GenerateTrialActivationTokenCommand,
  GenerateTrialActivationTokenResult
>;
