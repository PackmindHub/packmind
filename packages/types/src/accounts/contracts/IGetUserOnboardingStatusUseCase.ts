import { IUseCase, PackmindCommand } from '../../UseCase';

export type GetUserOnboardingStatusCommand = PackmindCommand;

export type GetUserOnboardingStatusResponse = {
  onboardingCompleted: boolean;
  isOrganizationCreator: boolean;
  showOnboarding: boolean;
  stepsToShow: ('welcome' | 'playbook' | 'build')[];
};

export type IGetUserOnboardingStatusUseCase = IUseCase<
  GetUserOnboardingStatusCommand,
  GetUserOnboardingStatusResponse
>;
