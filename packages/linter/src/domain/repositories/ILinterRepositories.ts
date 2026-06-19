import { IActiveDetectionProgramRepository } from './IActiveDetectionProgramRepository';
import { IDetectionProgramRepository } from './IDetectionProgramRepository';
import { IDetectionProgramMetadataRepository } from './IDetectionProgramMetadataRepository';
import { IRuleDetectionHeuristicsRepository } from './IRuleDetectionHeuristicsRepository';
import { IRuleDetectionAssessmentRepository } from './IRuleDetectionAssessmentRepository';

export interface ILinterRepositories {
  getActiveDetectionProgramRepository(): IActiveDetectionProgramRepository;
  getDetectionProgramRepository(): IDetectionProgramRepository;
  getDetectionProgramMetadataRepository(): IDetectionProgramMetadataRepository;
  getRuleDetectionHeuristicsRepository(): IRuleDetectionHeuristicsRepository;
  getRuleDetectionAssessmentRepository(): IRuleDetectionAssessmentRepository;
}
