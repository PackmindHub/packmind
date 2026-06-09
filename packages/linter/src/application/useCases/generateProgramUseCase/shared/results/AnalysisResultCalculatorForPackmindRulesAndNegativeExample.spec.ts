import {
  createRuleExampleId,
  createRuleId,
  ProgrammingLanguage,
  RuleExample,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { DetectionMethodType } from '../generation/Types';
import AnalysisResultCalculatorForPackmindRulesAndNegativeExample from './AnalysisResultCalculatorForPackmindRulesAndNegativeExample';

describe('AnalysisResultCalculatorForPackmindRulesAndNegativeExample', () => {
  describe('computeAnalysisResult', () => {
    describe('when no violations are detected', () => {
      it('returns false negatives', () => {
        const ruleId = createRuleId(uuidv4());
        const ruleExample: RuleExample = {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'const x = 1;\nconst y = 2;',
          negative: 'function bad(a, b, c) {\n  return a + b + c;\n}',
        };

        const analysis =
          new AnalysisResultCalculatorForPackmindRulesAndNegativeExample(
            ruleId,
            ruleExample,
            DetectionMethodType.PROGRAM,
          );
        const result = analysis.computeAnalysisResult([]);

        expect(result).toEqual({
          ruleId,
          method: DetectionMethodType.PROGRAM,
          filePath: `Negative example for RuleExample ${ruleExample.id}`,
          positive: false,
          precision: 0,
          recall: 0,
          truePositives: [],
          falsePositives: [],
          falseNegatives: [
            {
              start: 0,
              end: 2,
            },
          ],
        });
      });
    });

    describe('when violation is detected in negative example', () => {
      it('returns true positives', () => {
        const ruleId = createRuleId(uuidv4());
        const ruleExample: RuleExample = {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'const x = 1;\nconst y = 2;',
          negative: 'function bad(a, b, c) {\n  return a + b + c;\n}',
        };

        const analysis =
          new AnalysisResultCalculatorForPackmindRulesAndNegativeExample(
            ruleId,
            ruleExample,
            DetectionMethodType.PROGRAM,
          );
        const result = analysis.computeAnalysisResult([1]);

        expect(result).toEqual({
          ruleId,
          method: DetectionMethodType.PROGRAM,
          filePath: `Negative example for RuleExample ${ruleExample.id}`,
          positive: false,
          precision: 1,
          recall: 1,
          truePositives: [
            {
              start: 0,
              end: 2,
            },
          ],
          falsePositives: [],
          falseNegatives: [],
        });
      });
    });

    describe('when violation is detected outside the negative example range', () => {
      it('returns false negatives', () => {
        const ruleId = createRuleId(uuidv4());
        const ruleExample: RuleExample = {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'const x = 1;',
          negative: 'function bad(a, b, c) {}',
        };

        const analysis =
          new AnalysisResultCalculatorForPackmindRulesAndNegativeExample(
            ruleId,
            ruleExample,
            DetectionMethodType.PROGRAM,
          );
        const result = analysis.computeAnalysisResult([15]);

        expect(result).toEqual({
          ruleId,
          method: DetectionMethodType.PROGRAM,
          filePath: `Negative example for RuleExample ${ruleExample.id}`,
          positive: false,
          precision: 0,
          recall: 0,
          truePositives: [],
          falsePositives: [],
          falseNegatives: [
            {
              start: 0,
              end: 0,
            },
          ],
        });
      });
    });
  });
});
