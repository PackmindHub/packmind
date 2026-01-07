import { IRepository } from '@packmind/types';
import { QueryOption } from '@packmind/types';
import type {
  ActiveDetectionProgram,
  LanguageDetectionPrograms,
} from '@packmind/types';
import { RuleId } from '@packmind/types';

export interface IActiveDetectionProgramRepository
  extends IRepository<ActiveDetectionProgram> {
  findByRuleId(
    ruleId: RuleId,
    opts?: QueryOption,
  ): Promise<ActiveDetectionProgram[]>;
  findByRuleIdAndLanguage(
    ruleId: RuleId,
    language: string,
    opts?: QueryOption,
  ): Promise<ActiveDetectionProgram | null>;
  findByRuleIdWithPrograms(
    ruleId: RuleId,
    opts?: QueryOption,
  ): Promise<LanguageDetectionPrograms[]>;
  updateActiveDetectionProgram(
    activeDetectionProgram: ActiveDetectionProgram,
  ): Promise<ActiveDetectionProgram>;
  deleteByRuleId(ruleId: RuleId): Promise<void>;
}
