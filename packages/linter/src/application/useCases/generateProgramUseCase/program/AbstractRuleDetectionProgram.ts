import { AbstractRuleDetectionMethod } from '../generation/AbstractRuleDetectionMethod';
import {
  AiAnswer,
  AnalysisResult,
  DetectionMethodType,
  ProgramGenerationResult,
  ProgramGenerationStatus,
} from '../generation/Types';
import {
  deleteProgram,
  executeProgramInDebugMode,
  extractionsViolationsFromRawOutput,
  writeProgram,
} from './ProgramExecutionUtils';
import AnalysisResultCalculator from '../results/AnalysisResultCalculator';
import DetectionToolingLogWriter from '../log/DetectionToolingLogWriter';
import {
  buildConversationWithDebuggingInformation,
  displayLinesOfViolations,
  getPromptInformDebuggingHasStarted,
} from './ProgramDebugger';
import { checkIfSourceCodeParsableWithAST } from './ProgramThirdPartyLibrary';
import ASTGenerationStrategy from './strategy/ast/ASTGenerationStrategy';
import RAWGenerationStrategy from './strategy/raw/RAWGenerationStrategy';
import AbstractGenerationStrategy from './strategy/AbstractGenerationStrategy';
import { parseCodeOrJsonFromAIAnswer } from './ProgramOutputUtils';
import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import {
  AI_RESPONSE_FORMAT,
  AIService,
  PromptConversation,
  PromptConversationRole,
  TokensUsed,
  AIPromptOptions,
} from '@packmind/types';
import { ILinterAstPort } from '@packmind/types';
import {
  PackmindTimeoutError,
  Program,
} from '../generation/TypesProgramGeneration';
import { callIndexJsWithInput } from '../utils/IO';
import { SourceCodeState } from '@packmind/types';
import { DetectionProgramRuleInput } from '@packmind/types';
import { wrapText } from '../utils/PromptUtils';
import Globals from '../utils/Globals';
import { GenerateRuleHeuristics } from '../assessment/GenerateRuleHeuristics';

export type SourceCodeRepresentation = {
  content: string;
  sourceCodeState: SourceCodeState;
};

const origin = 'AbstractRuleDetectionProgram';

export default abstract class AbstractRuleDetectionProgram extends AbstractRuleDetectionMethod {
  protected _generationStrategy: AbstractGenerationStrategy | null = null;
  private readonly ERROR_ICON: string = '🟥';

  constructor(
    protected readonly _detectionProgramRule: DetectionProgramRuleInput,
    protected readonly _aiService: AIService,
    protected readonly _logsWriter: DetectionToolingLogWriter,
    protected readonly _linterAstAdapter: ILinterAstPort | null = null,
    protected readonly _logger = new PackmindLogger(origin),
  ) {
    super(_detectionProgramRule, _aiService, _logsWriter);
  }

  public shouldGenerateHeuristics(): boolean {
    return (
      !this._detectionProgramRule.heuristics ||
      this._detectionProgramRule.heuristics.length === 0
    );
  }

  public async generateProgram(): Promise<ProgramGenerationStatus> {
    await this._logsWriter.addLogsMessage(
      DetectionToolingLogWriter.MESSAGES.AI_AGENT_PROGRAM_GENERATION_STARTED,
    );

    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] === Start generateProgram`,
    );

    // Generate detection heuristics before program generation if they don't exist
    let generatedHeuristics: string[] | null = null;
    if (this.shouldGenerateHeuristics()) {
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] No existing heuristics found, generating new ones`,
      );
      const generateHeuristics = new GenerateRuleHeuristics(
        this._detectionProgramRule.rule.id,
        this._aiService,
      );
      const heuristics = await generateHeuristics.generateHeuristics(
        this._detectionProgramRule,
      );

      if (heuristics) {
        this._detectionProgramRule.heuristics = heuristics;
        generatedHeuristics = heuristics;
        this._logger.info(
          `[${this._detectionProgramRule.rule.id}] Detection heuristics generated successfully`,
        );
      } else {
        this._logger.warn(
          `[${this._detectionProgramRule.rule.id}] No heuristics generated, continuing without them`,
        );
      }
    } else {
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] Using existing heuristics (${this._detectionProgramRule.heuristics?.length ?? 0} items)`,
      );
    }

    // IF AST Possible
    // 1. try with
    // 2. if not working, try without
    // IF AST Not Possible
    // 1. try without
    // 2. try without
    const isSourceCodeParsableWithAST = await checkIfSourceCodeParsableWithAST(
      this._detectionProgramRule,
      this._linterAstAdapter,
    );
    let programGenerationResult;
    if (isSourceCodeParsableWithAST) {
      programGenerationResult = await this.runASTGenerationStrategy();
    } else {
      programGenerationResult = await this.runRAWGenerationStrategy();
    }

    if (!programGenerationResult) {
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] - Error in program generation`,
      );
      throw new Error('Error in program generation - Please check logs');
    }

    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] ===== programGenerationResult`,
    );
    programGenerationResult.results.forEach((result) =>
      this._logger.info(
        `\t[${this._detectionProgramRule.rule.id}] ${JSON.stringify(result)}`,
      ),
    );

    await this.logFilesWithFailures(programGenerationResult);

    const success = programGenerationResult.results.every(
      (r) => r.recall === 1 && r.precision === 1,
    );

    let programDescription = '';
    if (success && programGenerationResult.program?.length) {
      programDescription = await this.generateProgramDescription(
        programGenerationResult.program,
      );
    }

    return {
      program: programGenerationResult.program,
      success,
      programDescription,
      sourceCodeState: programGenerationResult.sourceCodeState,
      generatedHeuristics,
    };
  }

  private async runRAWGenerationStrategy() {
    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] RAW Strategy started`,
    );
    let programGenerationResult =
      await this.tryToGenerateProgramWithRawCodeStrategy();
    const isSuccessful = (programGenerationResult?.results ?? []).every(
      (r) => r.recall === 1 && r.precision === 1,
    );
    if (!isSuccessful) {
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] RAW Strategy started again after first attempt failed`,
      );
      (programGenerationResult?.results ?? []).forEach((result) =>
        this._logger.info(
          `\t[${this._detectionProgramRule.rule.id}] ${JSON.stringify(result)}`,
        ),
      );
      programGenerationResult =
        await this.tryToGenerateProgramWithRawCodeStrategy();
    }
    return programGenerationResult;
  }

  private async runASTGenerationStrategy() {
    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] AST Strategy started`,
    );
    let programGenerationResult =
      await this.tryToGenerateProgramWithAstStrategy();
    const isSuccessful = (programGenerationResult?.results ?? []).every(
      (r) => r.recall === 1 && r.precision === 1,
    );
    if (!isSuccessful) {
      if (programGenerationResult) {
        await this.logFilesWithFailures(programGenerationResult);
        this._logger.info(
          `[${this._detectionProgramRule.rule.id}] RAW Strategy started after AST Failed`,
        );
        (programGenerationResult?.results ?? []).forEach((result) =>
          this._logger.info(
            `\t[${this._detectionProgramRule.rule.id}] ${JSON.stringify(result)}`,
          ),
        );
      }
      programGenerationResult =
        await this.tryToGenerateProgramWithRawCodeStrategy();
    }
    return programGenerationResult;
  }

  private async logFilesWithFailures(
    programGenerationResult: ProgramGenerationResult,
  ) {
    if (programGenerationResult) {
      programGenerationResult.results.forEach(async (r) => {
        const success = r.recall === 1 && r.precision === 1;
        if (!success) {
          const message = `🔴 Program failed on ${r.positive ? `positive` : `negative`} example in ${r.filePath}`;
          await this._logsWriter.addLogsMessage(message);
        }
      });
    }
  }

  private async tryToGenerateProgramWithAstStrategy(): Promise<ProgramGenerationResult | null> {
    this.combineTokensUsed();
    try {
      this._generationStrategy = new ASTGenerationStrategy(
        this._detectionProgramRule,
        this._aiService,
        this._linterAstAdapter,
      );
      const program = await this._generationStrategy.getInitialProgram();
      return this.tryToGenerateProgramWithStrategy(program);
    } catch (error) {
      const message = getErrorMessage(error);
      this._logger.error(
        `[${this._detectionProgramRule.rule.id}] Error when generating program with AST Strategy : ${message}`,
      );
      await this._logsWriter.addLogsMessage(
        `${this.ERROR_ICON} Error when generating program - ${message}`,
      );
      return null;
    }
  }

  private async tryToGenerateProgramWithRawCodeStrategy(): Promise<ProgramGenerationResult | null> {
    this.combineTokensUsed();

    try {
      this._generationStrategy = new RAWGenerationStrategy(
        this._detectionProgramRule,
        this._aiService,
      );
      const program = await this._generationStrategy.getInitialProgram();

      return this.tryToGenerateProgramWithStrategy(program);
    } catch (error) {
      const message = getErrorMessage(error);
      this._logger.error(
        `⚠[${this._detectionProgramRule.rule.id}] Error when generating program with RAW Strategy : ${message}`,
      );
      await this._logsWriter.addLogsMessage(
        `${this.ERROR_ICON} Error when generating program - ${message}`,
      );
      return null;
    }
  }

  private async tryToGenerateProgramWithStrategy(
    program: string,
  ): Promise<ProgramGenerationResult> {
    this.clearConversations();
    if (!this._generationStrategy) {
      throw new Error('_generationStrategy not initialized');
    }

    this._context = this._generationStrategy.initialPrompt;
    this.addMessageToConversation(program, PromptConversationRole.ASSISTANT);
    return this.testProgramAndIterateWithAgent(program);
  }

  private async generateProgramDescription(program: string) {
    const promptForProgramDescription = this.getPromptDescribeFunction(program);
    const answer = await this.callAiProvider([
      {
        role: PromptConversationRole.USER,
        message: promptForProgramDescription,
      },
    ]);

    if (answer.tokensUsed) {
      this._tokensUsed.push(answer.tokensUsed);
    }

    const programDescription = wrapText((answer?.data ?? '').trim());
    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] Program Description generated`,
    );
    return programDescription;
  }

  abstract testProgramAndIterateWithAgent(
    program: string,
  ): Promise<ProgramGenerationResult>;

  protected async computeProgram(
    inputSourceCodeFileToAnalyze: string,
    analysisCalculator: AnalysisResultCalculator,
    program: string,
  ): Promise<Program> {
    let programFound = false;
    let errorCount = 0;
    const MAX_ERRORS = 4;
    if (!this._generationStrategy) {
      throw new Error('_generationStrategy not initialized');
    }

    let programPath = await writeProgram(
      program,
      this._detectionProgramRule.rule.id,
      this._generationStrategy,
    );

    const inputFileContent: SourceCodeRepresentation =
      await this._generationStrategy.getFileInputFromContent(
        inputSourceCodeFileToAnalyze,
        this._detectionProgramRule.language,
      );

    let tryNumber = 1;
    const MAX_RETRY = 2;
    while (tryNumber <= MAX_RETRY) {
      if (this._aborted) {
        throw new PackmindTimeoutError(
          `[${this._detectionProgramRule.rule.id}] Job aborted, exiting`,
        );
      }

      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] Compute Program - Try number ${tryNumber}/${MAX_RETRY}`,
      );
      try {
        const outputArray = await executeProgramInDebugMode(
          programPath,
          inputFileContent,
        );
        deleteProgram(programPath);

        const result: AnalysisResult =
          analysisCalculator.computeAnalysisResult(outputArray);
        const requirementsFulfilled =
          result.precision === 1 && result.recall === 1;

        if (requirementsFulfilled) {
          this._logger.info(
            `[${this._detectionProgramRule.rule.id}] !!!! Congrats, precision and recall are of 1!`,
          );
          programFound = true;
          break;
        } else {
          await this.resetConversationWithContext();
          this._conversations.push({
            role: PromptConversationRole.ASSISTANT,
            message: program,
          });
          const prompt =
            this.preparePromptThatOutputsResultsOfProgramOnFirstIterations(
              result,
              inputFileContent,
            );
          this.addMessageToConversation(prompt, PromptConversationRole.USER);

          const response = await this.callAiProvider(this._conversations);
          if (!response.data) {
            throw new Error('No data returned by AI');
          }

          program = parseCodeOrJsonFromAIAnswer(response.data);
          if (program?.trim().length === 0) {
            throw new Error(
              `[${this._detectionProgramRule.rule.id}] Generated Program is empty`,
            );
          }
          programPath = await writeProgram(
            program,
            this._detectionProgramRule.rule.id,
            this._generationStrategy,
          );
          this._logger.debug(
            `[${this._detectionProgramRule.rule.id}]  Write new version of program ${program.length}`,
          );
        }
      } catch (error) {
        this._logger.error(
          `[${this._detectionProgramRule.rule.id}] Error when getting or executing the program ${getErrorMessage(error)}`,
        );
        this.throwErrorIfOutputContainFatalError(
          getErrorMessage(error),
          program,
        );
        errorCount++;

        await this.resetConversationWithContext();
        this._conversations.push({
          role: PromptConversationRole.ASSISTANT,
          message: program,
        });
        const prompt = this.getPromptTryAgainBecauseOfProgramFailure(
          isError(error) ? (error.stack ?? error.message) : '',
        );
        this.addMessageToConversation(prompt, PromptConversationRole.USER);

        const response = await this.callAiProvider(this._conversations);
        if (!response.data) {
          throw new Error('No response from AI');
        }

        this.addMessageToConversation(
          response.data,
          PromptConversationRole.ASSISTANT,
        );

        this._logger.debug(
          `[${this._detectionProgramRule.rule.id}] Write new version of program after mistake`,
        );
        program = parseCodeOrJsonFromAIAnswer(response.data);
        if (program.trim().length === 0) {
          throw new Error(
            `[${this._detectionProgramRule.rule.id}] Generated Program is empty`,
          );
        }
        programPath = await writeProgram(
          program,
          this._detectionProgramRule.rule.id,
          this._generationStrategy,
        );
      }
      tryNumber++;
      await this._logsWriter.addLogsMessage(
        DetectionToolingLogWriter.MESSAGES.AI_AGENT_NEW_PROGRAM_UNDER_TEST,
      );

      if (errorCount >= MAX_ERRORS) {
        //We consider that the Agent has taken a wrong path and we need to start over
        throw new Error(
          `[${this._detectionProgramRule.rule.id}] Too many errors in program execution`,
        );
      }
    }

    if (!programFound) {
      this.clearConversationsAndKeepOriginalInstructions();
      const __ret = await this.startDebugMode(
        program,
        inputFileContent,
        analysisCalculator,
        programFound,
      );
      program = __ret.program;
      programFound = __ret.programFound;
    }
    return {
      program,
      programFound,
      sourceCodeState: this._generationStrategy.getSourceCodeState(),
    };
  }

  private async callAiProvider(
    prompt: PromptConversation[],
    options: AIPromptOptions = {
      responseFormat: AI_RESPONSE_FORMAT.PLAIN_TEXT,
    },
  ) {
    const MAX_RETRY = 2;
    let i = 0;
    while (i <= MAX_RETRY) {
      try {
        const response = await this._aiService.executePromptWithHistory(
          prompt,
          options,
        );
        if (response.tokensUsed) {
          this._tokensUsed.push(response.tokensUsed);
        }

        return response;
      } catch (error) {
        const message = `${this.ERROR_ICON} Error when calling AI Provider - ${getErrorMessage(error)}`;
        this._logger.error(
          `[${this._detectionProgramRule.rule.id}] Error when calling AI Provider ${message}`,
        );
        await this._logsWriter.addLogsMessage(message);

        if (hasInnerError(error)) {
          //This display errors from Azure Open  AI in case of content filtering
          this._logger.error(
            `[${this._detectionProgramRule.rule.id}] Inner Error : ${JSON.stringify(error.innererror)}`,
          );
        }

        i++;
      }
    }
    throw new Error('Multiple errors after requesting AI provider');
  }

  private async startDebugMode(
    program: string,
    fileContent: SourceCodeRepresentation,
    analysisCalculator: AnalysisResultCalculator,
    programFound: boolean,
  ) {
    this._logger.info(`[${this._detectionProgramRule.rule.id}] Ok, let's help`);
    const suggestDebugPrompt = getPromptInformDebuggingHasStarted();
    this.addMessageToConversation(program, PromptConversationRole.ASSISTANT);
    this.addMessageToConversation(
      suggestDebugPrompt,
      PromptConversationRole.USER,
    );
    const response = await this.callAiProvider(this._conversations);
    if (!response.data) {
      throw new Error('No data returned by AI');
    }
    this._logger.debug(response.data);

    program = parseCodeOrJsonFromAIAnswer(response.data);
    //Ok, let's run this.
    await this._logsWriter.addLogsMessage(
      DetectionToolingLogWriter.MESSAGES.AI_AGENT_PROGRAM_DEBUGGING,
    );

    for (let i = 0; i < Globals.MAX_DEBUG_RETRY; i++) {
      if (this._aborted) {
        throw new PackmindTimeoutError(
          `[${this._detectionProgramRule.rule.id}] Job aborted, exiting`,
        );
      }

      await this._logsWriter.addLogsMessage(
        DetectionToolingLogWriter.MESSAGES.AI_AGENT_NEW_PROGRAM_UNDER_TEST,
      );
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] Debugging [${i}/${Globals.MAX_DEBUG_RETRY}]`,
      );
      const { output, result } = await this.runDebuggedProgramAndAnalyzeResults(
        {
          program,
          programFound: true,
        },
        fileContent,
        analysisCalculator,
      );
      if (result.precision === 1 && result.recall === 1) {
        programFound = true;
        await this._logsWriter.addLogsMessage(
          DetectionToolingLogWriter.MESSAGES.AI_AGENT_PROGRAM_SUCCESSFUL,
        );
        this._logger.info(
          `[${this._detectionProgramRule.rule.id}] !!! Generation successful at try ${i}`,
        );
        break;
      }
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] result.precision ${result.precision} - result.recall ${result.recall}`,
      );
      const debugOutput = await this.runDebugProgram(
        fileContent,
        program,
        output,
        result,
      );
      if (!debugOutput.answer) {
        throw new Error('No answer returned from AI');
      }

      program = parseCodeOrJsonFromAIAnswer(debugOutput.answer);
      if (program.trim().length === 0) {
        throw new Error(
          `[${this._detectionProgramRule.rule.id}] Generated Program is empty`,
        );
      }
    }
    return { program, programFound };
  }

  private preparePromptThatOutputsResultsOfProgramOnFirstIterations(
    result: AnalysisResult,
    fileContent: SourceCodeRepresentation,
  ) {
    //We enter here when the program is not working as expected, so at least one of these conditions will be true
    let prompt = `
With the following source code file as input of the program execution:
"""
${fileContent.content}
"""
`;
    if (result.falsePositives.length) {
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] add prompt with false positive`,
      );
      prompt = `${prompt}
${this.getPromptTryAgainBecauseOfFalsePositives(result)}`;
    }
    if (result.falseNegatives.length) {
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] add prompt with false negative`,
      );
      prompt = `${prompt}
${this.getPromptTryAgainBecauseOfFalseNegatives(result)}`;
    }
    if (result.truePositives.length) {
      this._logger.info(
        `[${this._detectionProgramRule.rule.id}] add prompt with true positives`,
      );
      prompt = `${prompt}
${this.getPromptToIndicateTruePositives(result)}`;
    }
    return prompt;
  }

  protected async runDebugProgram(
    fileContent: SourceCodeRepresentation,
    program: string,
    output: string,
    result: AnalysisResult,
  ): Promise<AiAnswer> {
    const debuggingConversation =
      await buildConversationWithDebuggingInformation(
        fileContent,
        this._context,
        program,
        output,
        result,
      );
    const responseDiag = await this.callAiProvider(debuggingConversation, {});
    this._logger.debug(`[${this._detectionProgramRule.rule.id}] === Diag`);
    return {
      answer: responseDiag.data,
      tokensUsed: responseDiag.tokensUsed,
    };
  }

  protected async runDebuggedProgramAndAnalyzeResults(
    program: Omit<Program, 'sourceCodeState'>,
    fileContent: SourceCodeRepresentation,
    analysisResultCalculator: AnalysisResultCalculator,
  ): Promise<{
    output: string;
    result: AnalysisResult;
  }> {
    const output: string = await this.getOutputForProgramBasedOnSourceCodeState(
      program,
      fileContent,
    );
    const programOutput = extractionsViolationsFromRawOutput(output);
    const result =
      analysisResultCalculator.computeAnalysisResult(programOutput);
    return { output, result };
  }

  protected async getOutputForProgramBasedOnSourceCodeState(
    program: Omit<Program, 'sourceCodeState'>,
    fileContent: SourceCodeRepresentation,
  ): Promise<string> {
    if (!this._generationStrategy) {
      throw new Error('_generationStrategy not initialized');
    }
    const programPath = await writeProgram(
      program.program,
      this._detectionProgramRule.rule.id,
      this._generationStrategy,
    );
    const output = await this.executeProgramAndGetRawOutput(
      programPath,
      fileContent,
    );
    this.throwErrorIfOutputContainFatalError(output, program.program);
    deleteProgram(programPath);
    return output;
  }

  private throwErrorIfOutputContainFatalError(output: string, program: string) {
    if (output?.includes('write EPIPE')) {
      this._logger.error(
        `[${this._detectionProgramRule.rule.id}] throw error as output contains a Fatal Error`,
      );
      throw new Error(
        `Fatal error, program is too corrupted to be debugged : ${output}); - Here is the program : ${program}`,
      );
    } else {
      this._logger.info('No fatal error found in output');
    }
  }

  private async executeProgramAndGetRawOutput(
    programPath: string,
    fileContent: SourceCodeRepresentation,
  ) {
    try {
      const output: string = await callIndexJsWithInput(
        programPath,
        fileContent.content,
      );
      this._logger.debug(`Output of debug program : ${output}`);
      return output.toString().trim().length ? output.toString().trim() : '[]';
    } catch (error) {
      this._logger.error(
        `[${this._detectionProgramRule.rule.id}] Error in execution of program: ${getErrorMessage(error)}`,
      );
      return `The program has raised a runtime error ${getErrorMessage(error)}`;
    }
  }

  private getPromptTryAgainBecauseOfFalseNegatives(result: AnalysisResult) {
    return `
* The provided program has missed false negatives on the following lines:
${displayLinesOfViolations(result.falseNegatives)}
Can you please check your program again and update it so that it can match these missed lines?
Please return only the program \n`;
  }

  protected getPromptToIndicateTruePositives(result: AnalysisResult) {
    return `
* God job, the provided program has detected the following lines as violations:
${displayLinesOfViolations(result.truePositives)}
This is great, and the updated version should preserve this behavior. \n`;
  }

  protected getPromptTryAgainBecauseOfFalsePositives(result: AnalysisResult) {
    return `
* The provided program has generated false positives on the following lines: ${result.falsePositives},
Can you please check your program again and update it to avoid the false positives?
Please return only the program. \n`;
  }

  protected getPromptTryAgainBecauseOfProgramFailure(error: string) {
    return `
The provided program has generated the following runtime errors:
 ---BeginCode---
 ${error}
 ---EndCode---
 Can you please check your program again to avoid such errors?
 Remember the main JavaScript function should be named 'checkSourceCode'.
 Please return only the program`;
  }

  private getPromptDescribeFunction(candidateProgram: string) {
    return `
Can you please describe how does 'checkSourceCode' function works and what kind of violations it aims to detect.
Provide a concise summary that explains the algorithm.
Discard the console.log instructions in the code.
Don't mention the function 'checkSourceCode' in the description, refer to it as 'the program'.
Don't mention how to use the program, only how it works.
Don't include 'example usage' in your program description.

Please return your output only in plain text.
 ---BeginCode---
${candidateProgram}
 ---EndCode---`;
  }

  abstract getFinalAnalysisResults(program: Program): Promise<AnalysisResult[]>;

  protected getMethodType(): DetectionMethodType {
    return DetectionMethodType.PROGRAM;
  }

  private combineTokensUsed() {
    if (this._generationStrategy) {
      this._tokensUsed = [
        ...this._tokensUsed,
        ...this._generationStrategy.tokensUsed,
      ];
    }
  }

  get tokensUsed(): TokensUsed[] {
    if (!this._generationStrategy) {
      throw new Error('_generationStrategy not initialized');
    }
    return [...this._tokensUsed, ...this._generationStrategy.tokensUsed];
  }
}

function hasInnerError(tbd: unknown): tbd is { innererror: unknown } {
  return (
    tbd !== null &&
    typeof tbd !== 'object' &&
    (tbd as { innererror: unknown })?.innererror !== undefined
  );
}

function isError(tbd: unknown): tbd is { stack?: string; message: string } {
  return (
    tbd !== null &&
    typeof tbd !== 'object' &&
    (tbd as { message: string }).message !== undefined
  );
}
