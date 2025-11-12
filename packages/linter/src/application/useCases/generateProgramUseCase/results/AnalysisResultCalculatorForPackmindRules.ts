import {
  AnalysisResult,
  LineViolation,
  RuleViolation,
} from '../generation/Types';
import AnalysisResultCalculator from './AnalysisResultCalculator';

/**
 * In this class, we compute result for source files where we have just negative and positive examples for 1 file
 */
export default abstract class AnalysisResultCalculatorForPackmindRules
  implements AnalysisResultCalculator
{
  public abstract computeAnalysisResult(results: number[]): AnalysisResult;

  public abstract isPositive(): boolean;

  protected isViolationFoundInSourceCode(
    results: number[],
    badExampleForRule: RuleViolation,
  ): boolean {
    // This checks that at least one violation is detected within the range of the bad example
    const truePositives = badExampleForRule.lines.filter((v) =>
      this.isViolationDetected(results, v),
    );
    return truePositives.length > 0;
  }

  protected isViolationDetected(
    results: number[],
    lineViolation: LineViolation,
  ): boolean {
    const isViolationDetected = results.some(
      (r) => r >= lineViolation.start && r <= lineViolation.end,
    );
    return isViolationDetected;
  }
}
