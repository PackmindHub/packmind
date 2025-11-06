import { IUseCase, PackmindCommand } from '../../UseCase';

export type GetOrganizationOnboardingStatusCommand = PackmindCommand;

export type OrganizationOnboardingStatus = {
  hasConnectedGitProvider: boolean;
  hasConnectedGitRepo: boolean;
  hasCreatedStandard: boolean;
  hasDeployed: boolean;
  hasInvitedColleague: boolean;
};

export type IGetOrganizationOnboardingStatusUseCase = IUseCase<
  GetOrganizationOnboardingStatusCommand,
  OrganizationOnboardingStatus
>;
