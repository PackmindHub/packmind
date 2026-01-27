import { Factory } from '@packmind/test-utils';
import {
  createRuleId,
  DetectionStatus,
  ProgrammingLanguage,
  createDetectionProgramId,
  DetectionModeEnum,
  type DetectionProgram,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const detectionProgramFactory: Factory<DetectionProgram> = (
  program?: Partial<DetectionProgram>,
) => {
  return {
    id: createDetectionProgramId(uuidv4()),
    code: 'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line, message: "Class found" }; }',
    version: 1,
    mode: DetectionModeEnum.SINGLE_AST,
    ruleId: createRuleId(uuidv4()),
    language: ProgrammingLanguage.JAVASCRIPT,
    status: DetectionStatus.READY,
    sourceCodeState: 'AST',
    createdAt: new Date(),
    ...program,
  };
};
