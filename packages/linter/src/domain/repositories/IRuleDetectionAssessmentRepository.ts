import { IRepository } from '@packmind/types';
import { RuleId } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import type { RuleDetectionAssessment } from '@packmind/types';

export interface IRuleDetectionAssessmentRepository extends IRepository<RuleDetectionAssessment> {
  get(
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): Promise<RuleDetectionAssessment | null>;
  findByRuleId(ruleId: RuleId): Promise<RuleDetectionAssessment[]>;
  update(assessment: RuleDetectionAssessment): Promise<RuleDetectionAssessment>;
  softDeleteByRuleId(ruleId: RuleId): Promise<void>;
}
