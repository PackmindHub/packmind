import { IPublicUseCase } from '../../UseCase';

export type StartTrialCommand = {
  agent: 'vs-code';
};

export type StartTrialResult = {
  mcpSetupUrl: string;
};

export type IStartTrial = IPublicUseCase<StartTrialCommand, StartTrialResult>;
