import { IDraftWriteResult } from '../../application/services/DraftFileWriterService';
import { IOnboardingDraft, IOnboardingState } from '../types/OnboardingDraft';

export type IGenerateDraftCommand = {
  projectPath: string;
  format?: 'md' | 'json' | 'both';
  outputDir?: string;
};

export type IGenerateDraftResult = {
  draft: IOnboardingDraft;
  paths: IDraftWriteResult;
};

export type ISendDraftResult = {
  success: boolean;
  error?: string;
};

export interface IDraftOnboardingUseCase {
  generateDraft(command: IGenerateDraftCommand): Promise<IGenerateDraftResult>;
  sendDraft(draft: IOnboardingDraft): Promise<ISendDraftResult>;
  getStatus(projectPath: string): Promise<IOnboardingState>;
}
