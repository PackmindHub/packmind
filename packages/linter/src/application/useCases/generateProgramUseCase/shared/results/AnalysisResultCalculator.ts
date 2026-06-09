import { AnalysisResult } from '../generation/Types';

export default interface AnalysisResultCalculator {
  computeAnalysisResult(results: number[]): AnalysisResult;
}
