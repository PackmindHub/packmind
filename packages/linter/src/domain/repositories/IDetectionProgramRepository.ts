import { IRepository } from '@packmind/types';
import { DetectionStatus } from '@packmind/types';
import { QueryOption } from '@packmind/types';
import type { DetectionProgram, DetectionProgramId } from '@packmind/types';
import { RuleId } from '@packmind/types';

export interface IDetectionProgramRepository extends IRepository<DetectionProgram> {
  findByRuleId(ruleId: RuleId, opts?: QueryOption): Promise<DetectionProgram[]>;
  findByRuleIdAndVersion(
    ruleId: RuleId,
    version: number,
    opts?: QueryOption,
  ): Promise<DetectionProgram | null>;
  findByRuleIdAndLanguage(
    ruleId: RuleId,
    language: string,
    opts?: QueryOption,
  ): Promise<DetectionProgram | null>;
  getLatestVersionByRuleIdAndLanguage(
    ruleId: RuleId,
    language: string,
  ): Promise<number>;
  updateStatus(
    detectionProgramId: DetectionProgramId,
    status: DetectionStatus,
  ): Promise<void>;
}
