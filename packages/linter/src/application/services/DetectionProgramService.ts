import { PackmindLogger } from '@packmind/logger';
import { RuleId } from '@packmind/types';
import { ILinterRepositories } from '../../domain/repositories/ILinterRepositories';
import type {
  ActiveDetectionProgram,
  DetectionProgram,
  LanguageDetectionPrograms,
} from '@packmind/types';

const origin = 'DetectionProgramService';

export class DetectionProgramService {
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('DetectionProgramService initialized');
  }

  async findActiveByRuleIdAndLanguage(ruleId: RuleId, language: string) {
    this.logger.info('Finding active detection program by rule and language', {
      ruleId,
      language,
    });
    try {
      const result = await this.linterRepositories
        .getActiveDetectionProgramRepository()
        .findByRuleIdAndLanguage(ruleId, language);
      if (!result) {
        this.logger.debug('Active detection program not found', {
          ruleId,
          language,
        });
      } else {
        this.logger.debug('Active detection program found', {
          ruleId,
          language,
        });
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Error finding active detection program by rule and language',
        { ruleId, language, error },
      );
      throw error;
    }
  }

  async findActiveByRuleIdWithPrograms(
    ruleId: RuleId,
  ): Promise<LanguageDetectionPrograms[]> {
    this.logger.info(
      'Finding active detection programs with programs by rule',
      { ruleId },
    );
    try {
      const result = await this.linterRepositories
        .getActiveDetectionProgramRepository()
        .findByRuleIdWithPrograms(ruleId);
      this.logger.debug('Active detection programs with programs fetched', {
        ruleId,
        count: Array.isArray(result) ? result.length : undefined,
      });
      return result;
    } catch (error) {
      this.logger.error(
        'Error finding active detection programs with programs by rule',
        { ruleId, error },
      );
      throw error;
    }
  }

  async addDetectionProgram(detectionProgram: DetectionProgram) {
    this.logger.info('Adding detection program', {
      ruleId: detectionProgram.ruleId,
      version: detectionProgram.version,
    });
    try {
      const result = await this.linterRepositories
        .getDetectionProgramRepository()
        .add(detectionProgram);
      this.logger.debug('Detection program added successfully', {
        ruleId: detectionProgram.ruleId,
        version: detectionProgram.version,
      });
      return result;
    } catch (error) {
      this.logger.error('Error adding detection program', {
        ruleId: detectionProgram.ruleId,
        version: detectionProgram.version,
        error,
      });
      throw error;
    }
  }

  async addActiveDetectionProgram(active: ActiveDetectionProgram) {
    this.logger.info('Adding active detection program', {
      ruleId: active.ruleId,
      language: active.language,
    });
    try {
      const result = await this.linterRepositories
        .getActiveDetectionProgramRepository()
        .add(active);
      this.logger.debug('Active detection program added successfully', {
        ruleId: active.ruleId,
        language: active.language,
      });
      return result;
    } catch (error) {
      this.logger.error('Error adding active detection program', {
        ruleId: active.ruleId,
        language: active.language,
        error,
      });
      throw error;
    }
  }
}
