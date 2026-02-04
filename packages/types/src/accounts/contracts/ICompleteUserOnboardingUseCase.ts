import { IUseCase, PackmindCommand } from '../../UseCase';

export type CompleteUserOnboardingCommand = PackmindCommand;

export type CompleteUserOnboardingResponse = {
  success: boolean;
};

export type ICompleteUserOnboardingUseCase = IUseCase<
  CompleteUserOnboardingCommand,
  CompleteUserOnboardingResponse
>;
