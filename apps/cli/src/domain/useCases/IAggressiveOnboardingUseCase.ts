import { IPublicUseCase } from '@packmind/types';
import { IGeneratedContent } from '../../application/services/ContentPreviewService';
import { IProjectScanResult } from '../../application/services/ProjectScannerService';

export type IAggressiveOnboardingCommand = {
  projectPath?: string;
};

export type IAggressiveOnboardingResult = {
  content: IGeneratedContent;
  preview: string;
  scanResult: IProjectScanResult;
};

export type IAggressiveOnboardingUseCase = IPublicUseCase<
  IAggressiveOnboardingCommand,
  IAggressiveOnboardingResult
>;
