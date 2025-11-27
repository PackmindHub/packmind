import { Factory } from '@packmind/test-utils';
import {
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
  createDetectionProgramId,
  createRuleId,
  ProgrammingLanguage,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const activeDetectionProgramFactory: Factory<ActiveDetectionProgram> = (
  activeProgram?: Partial<ActiveDetectionProgram>,
) => {
  return {
    id: createActiveDetectionProgramId(uuidv4()),
    detectionProgramVersion: createDetectionProgramId(uuidv4()),
    ruleId: createRuleId(uuidv4()),
    language: ProgrammingLanguage.JAVASCRIPT,
    detectionProgramDraftVersion: null,
    ...activeProgram,
  };
};
