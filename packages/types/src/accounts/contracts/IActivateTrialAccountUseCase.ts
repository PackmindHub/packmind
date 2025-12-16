import { IPublicUseCase, PublicPackmindCommand } from '../../UseCase';
import { TrialActivationToken } from '../TrialActivationToken';
import { User } from '../User';
import { Organization } from '../Organization';

export type ActivateTrialAccountCommand = PublicPackmindCommand & {
  activationToken: TrialActivationToken;
  email: string;
  password: string;
  organizationName: string;
};

export type ActivateTrialAccountResult = {
  user: User;
  organization: Organization;
};

export type IActivateTrialAccountUseCase = IPublicUseCase<
  ActivateTrialAccountCommand,
  ActivateTrialAccountResult
>;
