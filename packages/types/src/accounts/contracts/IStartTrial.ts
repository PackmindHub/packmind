import { IPublicUseCase } from '../../UseCase';
import { Organization } from '../Organization';
import { User, UserOrganizationRole } from '../User';

export type StartTrialCommand = {
  agent: 'vs-code';
};

export type StartTrialResult = {
  user: User;
  organization: Organization;
  role: UserOrganizationRole;
};

export type IStartTrial = IPublicUseCase<StartTrialCommand, StartTrialResult>;
