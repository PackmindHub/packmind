import AbstractRuleDetectionProgram from './AbstractRuleDetectionProgram';
import { AnalysisResult, ProgramGenerationResult } from '../generation/Types';
import {
  deleteProgram,
  executeProgramInProductionMode,
  writeProgram,
} from './ProgramExecutionUtils';
import DetectionToolingLogWriter from '../log/DetectionToolingLogWriter';
import AnalysisResultCalculatorForPackmindRulesAndPositiveExample from '../results/AnalysisResultCalculatorForPackmindRulesAndPositiveExample';
import AnalysisResultCalculatorForPackmindRulesAndNegativeExample from '../results/AnalysisResultCalculatorForPackmindRulesAndNegativeExample';
import {
  PackmindTimeoutError,
  Program,
} from '../generation/TypesProgramGeneration';
import { indentFileContent, limitFileContent } from '../utils/PromptUtils';

export default class DetectionProgramPackmindRule extends AbstractRuleDetectionProgram {
  async testProgramAndIterateWithAgent(
    program: string,
  ): Promise<ProgramGenerationResult> {
    await this._logsWriter.addLogsMessage(
      DetectionToolingLogWriter.MESSAGES.AI_AGENT_PROGRAM_TEST_AGAINST_EXAMPLES,
    );

    let tryNumber = 0;
    const MAX_RETRY = 3;

    while (tryNumber <= MAX_RETRY) {
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] testProgramAndIterateWithAgent - try ${tryNumber}/${MAX_RETRY}`,
      );
      try {
        const result = await this.testAgainstNegativeExamples(program);
        program = result.program;
        const programFoundOnNegativeExamples =
          result.programFoundOnNegativeExamples;
        const programAfterCheckAgainstNegativeExamples = program;

        if (programFoundOnNegativeExamples) {
          this._logger.info(
            `[${this._detectionProgramRule.rule.id}] Now checking program against ${this.getNumberOfPositiveExamples()} good examples`,
          );
          if (this.hasPositiveExamples()) {
            await this._logsWriter.addLogsMessage(
              DetectionToolingLogWriter.MESSAGES
                .AI_AGENT_PROGRAM_CHECK_POSITIVE_EXAMPLES,
            );
            program = await this.buildProgramAgainstPositiveExamples(program);
          }
          if (program === programAfterCheckAgainstNegativeExamples) {
            this._logger.info(
              `[${this._detectionProgramRule.rule.id}] Program has not been updated against positive examples`,
            );
            break;
          } else {
            this._logger.info(
              `[${this._detectionProgramRule.rule.id}] Program has been updated against positive examples, we need to check again against negative examples`,
            );
          }
        } else {
          this._logger.info(
            `[${this._detectionProgramRule.rule.id}] Some negative examples are not covered by the program, we need to regenerate the program`,
          );
        }
      } catch (error) {
        this._logger.error(
          `[${this._detectionProgramRule.rule.id}] Runtime error ${error}`,
        );
        if (error instanceof PackmindTimeoutError) {
          await this._logsWriter.addLogsMessage(
            DetectionToolingLogWriter.MESSAGES.AI_AGENT_TIMEOUT,
          );
          throw new Error(error.message);
        }
      }
      tryNumber++;
    }

    await this._logsWriter.addLogsMessage(
      DetectionToolingLogWriter.MESSAGES.AI_AGENT_NEW_PROGRAM_UNDER_TEST,
    );
    if (!this._generationStrategy) {
      throw new Error('_generationStrategy not initialized');
    }
    const sourceCodeState = this._generationStrategy.getSourceCodeState();
    const analysisResults = await this.getFinalAnalysisResults({
      program,
      programFound: true,
      sourceCodeState,
    });

    return {
      program,
      sourceCodeState,
      results: analysisResults,
    };
  }

  private hasPositiveExamples(): boolean {
    return this._detectionProgramRule.ruleExamples.some(
      (ex) => ex.positive?.length && ex.positive?.trim().length,
    );
  }

  private getNumberOfPositiveExamples(): number {
    return this._detectionProgramRule.ruleExamples.filter(
      (ex) => ex.positive?.length && ex.positive?.trim().length,
    ).length;
  }

  private getNumberOfNegativeExamples(): number {
    return this._detectionProgramRule.ruleExamples.filter(
      (ex) => ex.negative?.length && ex.negative?.trim().length,
    ).length;
  }

  private async testAgainstNegativeExamples(program: string): Promise<{
    program: string;
    programFoundOnNegativeExamples: boolean;
  }> {
    let programFoundOnNegativeExamples = true;
    let cptExample = 1;
    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] start testing against negative examples`,
    );

    for (const example of this._detectionProgramRule.ruleExamples) {
      if (example.negative?.length && example.negative?.trim().length) {
        this._logger.info(
          `[${this._detectionProgramRule.rule.id}] testing program against negative example ${cptExample}/${this.getNumberOfNegativeExamples()}`,
        );
        const analysisCalculator =
          new AnalysisResultCalculatorForPackmindRulesAndNegativeExample(
            this._detectionProgramRule.rule.id,
            example,
            this.getMethodType(),
          );
        const result = await this.computeProgram(
          example.negative,
          analysisCalculator,
          program,
        );
        program = result.program;
        programFoundOnNegativeExamples =
          programFoundOnNegativeExamples && result.programFound;
        cptExample++;

        await this.logTestExecution(`Example #${cptExample}`, example.negative);
      }
    }
    return { program, programFoundOnNegativeExamples };
  }

  private async buildProgramAgainstPositiveExamples(
    program: string,
  ): Promise<string> {
    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] start testing against positive examples`,
    );
    let cptExample = 1;

    for (const example of this._detectionProgramRule.ruleExamples) {
      if (example.positive?.length && example.positive.trim()?.length) {
        this._logger.info(
          `[${this._detectionProgramRule.rule.id}] testing program against positive example ${cptExample}/${this.getNumberOfPositiveExamples()}`,
        );
        const analysisCalculator =
          new AnalysisResultCalculatorForPackmindRulesAndPositiveExample(
            this._detectionProgramRule.rule.id,
            example,
            this.getMethodType(),
          );
        const result = await this.computeProgram(
          example.positive,
          analysisCalculator,
          program,
        );
        program = result.program;
        await this.logTestExecution(`Example #${cptExample}`, example.positive);
        cptExample++;
      }
    }
    return program;
  }

  private async logTestExecution(testName: string, testContent: string) {
    if (testName) {
      return this._logsWriter.addLogsMessage(
        DetectionToolingLogWriter.MESSAGES.AI_AGENT_RUN_TEST,
        { testName },
      );
    }
    return this._logsWriter.addLogsMessage(
      DetectionToolingLogWriter.MESSAGES.AI_AGENT_RUN_TEST_NO_NAME,
      {
        testContent: indentFileContent(limitFileContent(testContent, 5), '  '),
      },
    );
  }

  async getFinalAnalysisResults(program: Program): Promise<AnalysisResult[]> {
    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] build final results`,
    );
    const analysisResults: AnalysisResult[] = [];
    if (!this._generationStrategy) {
      throw new Error('_generationStrategy not initialized');
    }

    const programPath = await writeProgram(
      program.program,
      this._detectionProgramRule.rule.id,
      this._generationStrategy,
    );
    const methodType = this.getMethodType();

    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] final results will be tested against ${this._detectionProgramRule.ruleExamples.length} examples`,
    );

    for (const example of this._detectionProgramRule.ruleExamples) {
      if (example.negative?.length) {
        const inputForProgram =
          await this._generationStrategy.getFileInputFromContent(
            example.negative,
            this._detectionProgramRule.language,
          );
        const lines = await executeProgramInProductionMode(
          this._detectionProgramRule.rule.id,
          programPath,
          inputForProgram,
          `Negative Example`,
        );
        const result: AnalysisResult =
          new AnalysisResultCalculatorForPackmindRulesAndNegativeExample(
            this._detectionProgramRule.rule.id,
            example,
            methodType,
          ).computeAnalysisResult(lines);
        analysisResults.push(result);
      }

      if (example.positive?.length) {
        const inputForProgram =
          await this._generationStrategy.getFileInputFromContent(
            example.positive,
            this._detectionProgramRule.language,
          );
        const lines = await executeProgramInProductionMode(
          this._detectionProgramRule.rule.id,
          programPath,
          inputForProgram,
          `Positive Example`,
        );
        const result: AnalysisResult =
          new AnalysisResultCalculatorForPackmindRulesAndPositiveExample(
            this._detectionProgramRule.rule.id,
            example,
            methodType,
          ).computeAnalysisResult(lines);
        analysisResults.push(result);
      }
    }

    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] final ${analysisResults.length} results have been built`,
    );
    deleteProgram(programPath);
    return analysisResults;
  }
}
