import {
  createRuleExampleId,
  createRuleId,
  ProgrammingLanguage,
  RuleExample,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { DetectionMethodType } from '../generation/Types';
import AnalysisResultCalculatorForPackmindRulesAndPositiveExample from './AnalysisResultCalculatorForPackmindRulesAndPositiveExample';

describe('AnalysisResultCalculatorForPackmindRulesAndPositiveExample', () => {
  describe('computeAnalysisResult', () => {
    describe('when no violation is found on a positive example', () => {
      it('returns perfect precision and recall', () => {
        const ruleId = createRuleId(uuidv4());
        const ruleExample: RuleExample = {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'function good(a, b) {\n  return a + b;\n}',
          negative: 'function bad(a, b, c) {}',
        };

        const analysis =
          new AnalysisResultCalculatorForPackmindRulesAndPositiveExample(
            ruleId,
            ruleExample,
            DetectionMethodType.PROGRAM,
          );
        const result = analysis.computeAnalysisResult([]);

        expect(result).toEqual({
          ruleId,
          method: DetectionMethodType.PROGRAM,
          filePath: `Positive example for RuleExample ${ruleExample.id}`,
          positive: true,
          precision: 1,
          recall: 1,
          truePositives: [],
          falsePositives: [],
          falseNegatives: [],
        });
      });
    });

    describe('when violation is found on a positive example', () => {
      it('returns zero precision and recall', () => {
        const ruleId = createRuleId(uuidv4());
        const ruleExample: RuleExample = {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'function good(a, b) {}',
          negative: 'function bad(a, b, c) {}',
        };

        const analysis =
          new AnalysisResultCalculatorForPackmindRulesAndPositiveExample(
            ruleId,
            ruleExample,
            DetectionMethodType.PROGRAM,
          );
        const result = analysis.computeAnalysisResult([0]);

        expect(result).toEqual({
          ruleId,
          method: DetectionMethodType.PROGRAM,
          filePath: `Positive example for RuleExample ${ruleExample.id}`,
          positive: true,
          precision: 0,
          recall: 0,
          truePositives: [],
          falsePositives: [0],
          falseNegatives: [],
        });
      });
    });

    describe('when no violation is found in positive example but violations exist elsewhere', () => {
      it('returns perfect precision and recall', () => {
        const ruleId = createRuleId(uuidv4());
        const ruleExample: RuleExample = {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'function good(a, b) {}',
          negative: 'function bad(a, b, c) {}',
        };

        const analysis =
          new AnalysisResultCalculatorForPackmindRulesAndPositiveExample(
            ruleId,
            ruleExample,
            DetectionMethodType.PROGRAM,
          );
        const result = analysis.computeAnalysisResult([13, 14, 15]);

        expect(result).toEqual({
          ruleId,
          method: DetectionMethodType.PROGRAM,
          filePath: `Positive example for RuleExample ${ruleExample.id}`,
          positive: true,
          precision: 1,
          recall: 1,
          truePositives: [],
          falsePositives: [],
          falseNegatives: [],
        });
      });
    });
  });
});
