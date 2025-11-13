import { v4 as uuidv4 } from 'uuid';
import {
  DetectionHeuristics,
  createDetectionHeuristicsId,
  createRuleId,
  ProgrammingLanguage,
} from '@packmind/types';

export const detectionHeuristicsFactory = (
  overrides?: Partial<DetectionHeuristics>,
): DetectionHeuristics => {
  return {
    id: createDetectionHeuristicsId(uuidv4()),
    ruleId: createRuleId(uuidv4()),
    language: ProgrammingLanguage.TYPESCRIPT,
    heuristics: 'Default heuristics content',
    ...overrides,
  };
};
