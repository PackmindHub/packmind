import AnalysisResultCalculatorForPackmindRules from './AnalysisResultCalculatorForPackmindRules';
import {
  AnalysisResult,
  DetectionMethodType,
  RuleViolation,
} from '../generation/Types';
import { RuleExample, RuleId } from '@packmind/types';

export default class AnalysisResultCalculatorForPackmindRulesAndNegativeExample extends AnalysisResultCalculatorForPackmindRules {
  constructor(
    private readonly ruleId: RuleId,
    private readonly example: RuleExample,
    private readonly detectionType: DetectionMethodType,
  ) {
    super();
  }

  computeAnalysisResult(results: number[]): AnalysisResult {
    const violation: RuleViolation = {
      rule: this.ruleId,
      lines: [
        {
          start: 0, // We don't have location area in our new Packmind system
          end: this.example.negative.split('\n').length - 1,
        },
      ],
    };
    if (
      results.length &&
      this.isViolationFoundInSourceCode(results, violation)
    ) {
      //At least a result has been found
      const truePositives = violation.lines.filter((v) =>
        this.isViolationDetected(results, v),
      );
      return {
        ruleId: this.ruleId,
        method: this.detectionType,
        filePath: this.getNegativeExampleFilePath(),
        positive: this.isPositive(),
        precision: 1,
        recall: 1,
        truePositives,
        falsePositives: [],
        falseNegatives: [],
      };
    } else {
      //No result were found, so the violation has not been detected
      return {
        ruleId: this.ruleId,
        method: this.detectionType,
        filePath: this.getNegativeExampleFilePath(),
        positive: this.isPositive(),
        precision: 0,
        recall: 0,
        truePositives: [],
        falsePositives: [],
        falseNegatives: [
          {
            start: 0, // We don't have location area in our new Packmind system
            end: this.example.negative.split('\n').length - 1,
          },
        ],
      };
    }
  }

  private getNegativeExampleFilePath() {
    return `Negative example for RuleExample ${this.example.id}`;
  }

  isPositive(): boolean {
    return false;
  }
}
