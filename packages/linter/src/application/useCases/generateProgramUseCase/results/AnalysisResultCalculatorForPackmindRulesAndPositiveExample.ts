import AnalysisResultCalculatorForPackmindRules from './AnalysisResultCalculatorForPackmindRules';
import {
  AnalysisResult,
  DetectionMethodType,
  RuleViolation,
} from '../generation/Types';
import { RuleExample, RuleId } from '@packmind/types';

export default class AnalysisResultCalculatorForPackmindRulesAndPositiveExample extends AnalysisResultCalculatorForPackmindRules {
  constructor(
    private readonly ruleId: RuleId,
    private readonly example: RuleExample,
    private readonly detectionType: DetectionMethodType,
  ) {
    super();
  }

  computeAnalysisResult(results: number[]): AnalysisResult {
    if (!results.length) {
      return {
        ruleId: this.ruleId,
        method: this.detectionType,
        filePath: this.getPositiveExampleFilePath(),
        positive: this.isPositive(),
        precision: 1,
        recall: 1,
        truePositives: [],
        falsePositives: [],
        falseNegatives: [],
      };
    }
    const violation: RuleViolation = {
      rule: this.ruleId,
      lines: [
        {
          start: 0, // We don't have location area in our new Packmind system
          end: this.example.positive.split('\n').length - 1,
        },
      ],
    };
    if (this.isViolationFoundInSourceCode(results, violation)) {
      const falsePositives = violation.lines
        .filter((v) => this.isViolationDetected(results, v))
        .map((l) => l.start);
      return {
        ruleId: this.ruleId,
        method: this.detectionType,
        filePath: this.getPositiveExampleFilePath(),
        positive: this.isPositive(),
        precision: 0,
        recall: 0,
        truePositives: [],
        falsePositives,
        falseNegatives: [],
      };
    } else {
      //This mean this is not found, and we can't assume nothing on other lines
      return {
        ruleId: this.ruleId,
        method: this.detectionType,
        filePath: this.getPositiveExampleFilePath(),
        positive: this.isPositive(),
        precision: 1,
        recall: 1,
        truePositives: [],
        falsePositives: [],
        falseNegatives: [],
      };
    }
  }

  private getPositiveExampleFilePath() {
    return `Positive example for RuleExample ${this.example.id}`;
  }

  isPositive(): boolean {
    return true;
  }
}
