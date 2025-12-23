import { IPublicUseCase } from '../../UseCase';
import { Organization } from '../Organization';
import { User, UserOrganizationRole } from '../User';

export type StartTrialCommandAgents =
  | 'vs-code'
  | 'claude'
  | 'cursor'
  | 'continue-dev'
  | 'jetbrains'
  | 'other';
export type StartTrialCommand = {
  agent: StartTrialCommandAgents;
};

export type StartTrialResult = {
  user: User;
  organization: Organization;
  role: UserOrganizationRole;
  mcpToken?: string;
  mcpUrl?: string;
};

export type IStartTrial = IPublicUseCase<StartTrialCommand, StartTrialResult>;
