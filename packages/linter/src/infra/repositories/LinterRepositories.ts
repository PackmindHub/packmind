import { ILinterRepositories } from '../../domain/repositories/ILinterRepositories';
import { IActiveDetectionProgramRepository } from '../../domain/repositories/IActiveDetectionProgramRepository';
import { IDetectionProgramRepository } from '../../domain/repositories/IDetectionProgramRepository';
import { DataSource } from 'typeorm';
import { ActiveDetectionProgramRepository } from './ActiveDetectionProgramRepository';
import { ActiveDetectionProgramSchema } from '../schemas/ActiveDetectionProgramSchema';
import { DetectionProgramRepository } from './DetectionProgramRepository';
import { DetectionProgramSchema } from '../schemas/DetectionProgramSchema';
import { IDetectionProgramMetadataRepository } from '../../domain/repositories/IDetectionProgramMetadataRepository';
import { IRuleDetectionHeuristicsRepository } from '../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { DetectionProgramMetadataCacheRepository } from './DetectionProgramMetadataCacheRepository';
import { RuleDetectionHeuristicsRepository } from './RuleDetectionHeuristicsRepository';
import { IRuleDetectionAssessmentRepository } from '../../domain/repositories/IRuleDetectionAssessmentRepository';
import { RuleDetectionAssessmentRepository } from './RuleDetectionAssessmentRepository';
import { RuleDetectionAssessmentSchema } from '../schemas/RuleDetectionAssessmentSchema';
import { DetectionHeuristicsSchema } from '../schemas/DetectionHeuristicsSchema';

export class LinterRepositories implements ILinterRepositories {
  private readonly activeDetectionProgramRepository: IActiveDetectionProgramRepository;
  private readonly detectionProgramRepository: IDetectionProgramRepository;
  private readonly detectionProgramMetadataRepository: IDetectionProgramMetadataRepository;
  private readonly ruleDetectionHeuristicsRepository: IRuleDetectionHeuristicsRepository;
  private readonly ruleDetectionAssessmentRepository: IRuleDetectionAssessmentRepository;

  constructor(private readonly dataSource: DataSource) {
    this.activeDetectionProgramRepository =
      new ActiveDetectionProgramRepository(
        this.dataSource.getRepository(ActiveDetectionProgramSchema),
      );
    this.detectionProgramRepository = new DetectionProgramRepository(
      this.dataSource.getRepository(DetectionProgramSchema),
    );
    this.detectionProgramMetadataRepository =
      new DetectionProgramMetadataCacheRepository();
    this.ruleDetectionHeuristicsRepository =
      new RuleDetectionHeuristicsRepository(
        this.dataSource.getRepository(DetectionHeuristicsSchema),
      );
    this.ruleDetectionAssessmentRepository =
      new RuleDetectionAssessmentRepository(
        this.dataSource.getRepository(RuleDetectionAssessmentSchema),
      );
  }

  getActiveDetectionProgramRepository(): IActiveDetectionProgramRepository {
    return this.activeDetectionProgramRepository;
  }

  getDetectionProgramRepository(): IDetectionProgramRepository {
    return this.detectionProgramRepository;
  }

  getDetectionProgramMetadataRepository(): IDetectionProgramMetadataRepository {
    return this.detectionProgramMetadataRepository;
  }

  getRuleDetectionHeuristicsRepository(): IRuleDetectionHeuristicsRepository {
    return this.ruleDetectionHeuristicsRepository;
  }

  getRuleDetectionAssessmentRepository(): IRuleDetectionAssessmentRepository {
    return this.ruleDetectionAssessmentRepository;
  }
}
