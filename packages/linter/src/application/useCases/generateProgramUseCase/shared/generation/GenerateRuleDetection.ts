import { DetectionMethodType, DetectionTechniqueGenerated } from './Types';
import DetectionProgramPackmindRule from '../program/DetectionProgramPackmindRule';
import DetectionToolingLogWriter from '../log/DetectionToolingLogWriter';
import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import { AIService, TokensUsed } from '@packmind/types';
import { DetectionStatus, ILinterAstPort } from '@packmind/types';
import { DetectionProgramRuleInput } from '@packmind/types';
import {
  DetectionProgram,
  DetectionProgramId,
  DetectionModeEnum,
} from '@packmind/types';
import { clearConsoleLogFromProgramOutput } from '../program/ProgramExecutionUtils';

const origin = 'GenerateRuleDetection';

export class GenerateRuleDetection {
  private readonly tokensUsed: TokensUsed[] = [];
  private _generatedHeuristics: string[] | null = null;

  constructor(
    private readonly _taskId: string,
    private readonly _detectionProgramId: DetectionProgramId,
    private readonly _detectionProgramRuleInput: DetectionProgramRuleInput,
    private readonly _aiService: AIService,
    private readonly _logsWriter: DetectionToolingLogWriter,
    private readonly _linterAstAdapter: ILinterAstPort | null = null,
    private readonly _programGenerator = new DetectionProgramPackmindRule(
      _detectionProgramRuleInput,
      _aiService,
      _logsWriter,
      _linterAstAdapter,
    ),
    private readonly _logger = new PackmindLogger(origin),
  ) {}

  //These are some stuff related to first work achieved in Q3 24, but were abandonned.
  public async assessDetectionPractice(): Promise<
    Omit<DetectionProgram, 'version'> & {
      generatedHeuristics?: string[] | null;
    }
  > {
    await this._logsWriter.addLogsMessage(
      DetectionToolingLogWriter.MESSAGES.AI_AGENT_STRATEGY_ASSESSMENT,
    );

    try {
      const detectionTechniqueGenerated =
        await this.getSyntacticDetectionTechnique();

      // Store generated heuristics for later use
      this._generatedHeuristics =
        detectionTechniqueGenerated.generatedHeuristics ?? null;

      this._logger.info(
        `[${this._detectionProgramRuleInput.rule.id}] Detection Technique Generated over`,
      );
      const detectionTechnique = DetectionMethodType.PROGRAM;

      if (
        detectionTechniqueGenerated.success &&
        detectionTechniqueGenerated.programDescription
      ) {
        await this._logsWriter.addLogsMessage(
          DetectionToolingLogWriter.MESSAGES.AI_AGENT_RESULT_SUCCESS,
        );
        await this._logsWriter.updateProgramDescription(
          detectionTechniqueGenerated.programDescription,
        );
        await this._logsWriter.updateTokensUsed(this.assessTokensUsage());
        return await this.buildAndReturnSuccessfulSyntacticDetectionTooling(
          detectionTechniqueGenerated,
        );
      } else {
        await this._logsWriter.addLogsMessage(
          DetectionToolingLogWriter.MESSAGES
            .AI_AGENT_RESULT_NOT_GOOD_WILL_RESTART,
        );
        await this._logsWriter.updateTokensUsed(this.assessTokensUsage());
        return this.buildAndReturnNotSuccessfulSyntacticDetectionTooling(
          detectionTechnique,
          detectionTechniqueGenerated,
        );
      }
    } catch (error) {
      await this._logsWriter.addLogsMessage(
        DetectionToolingLogWriter.MESSAGES.AI_AGENT_CRASH_RESTART,
      );
      await this._logsWriter.updateTokensUsed(this.assessTokensUsage());
      this._logger.error(
        `Error while generating the detection tooling: ${getErrorMessage(error)}`,
        { error },
      );
      //In case of error, we return a failure to avoid pending
      return {
        id: this._detectionProgramId,
        ruleId: this._detectionProgramRuleInput.rule.id,
        status: DetectionStatus.FAILURE,
        language: this._detectionProgramRuleInput.language,
        //logs: this._logsWriter.logs,
        sourceCodeState: 'NONE',
        code: '',
        mode: DetectionModeEnum.SINGLE_AST,
        generatedHeuristics: this._generatedHeuristics,
      };
    }
  }

  private async buildAndReturnSuccessfulSyntacticDetectionTooling(
    detectionTechniqueGenerated: DetectionTechniqueGenerated,
  ): Promise<
    Omit<DetectionProgram, 'version'> & {
      generatedHeuristics?: string[] | null;
    }
  > {
    const cleanedProgram = await clearConsoleLogFromProgramOutput(
      detectionTechniqueGenerated.program ?? '',
      this._linterAstAdapter,
    );
    return {
      id: this._detectionProgramId,
      ruleId: this._detectionProgramRuleInput.rule.id,
      status: DetectionStatus.READY,
      sourceCodeState: detectionTechniqueGenerated.sourceCodeState,
      language: this._detectionProgramRuleInput.language,
      mode: DetectionModeEnum.SINGLE_AST,
      code: cleanedProgram,
      generatedHeuristics: this._generatedHeuristics,
      //programDescription: detectionTechniqueGenerated.programDescription,
      //logs: this._logsWriter.logs
    };
  }

  private buildAndReturnNotSuccessfulSyntacticDetectionTooling(
    detectionTechnique: string,
    detectionTechniqueGenerated: DetectionTechniqueGenerated,
  ): Omit<DetectionProgram, 'version'> & {
    generatedHeuristics?: string[] | null;
  } {
    return {
      id: this._detectionProgramId,
      ruleId: this._detectionProgramRuleInput.rule.id,
      status: DetectionStatus.READY,
      sourceCodeState: detectionTechniqueGenerated.sourceCodeState,
      mode: DetectionModeEnum.SINGLE_AST,
      language: this._detectionProgramRuleInput.language,
      code: detectionTechniqueGenerated.program ?? '',
      generatedHeuristics: this._generatedHeuristics,
      //programDescription: detectionTechniqueGenerated.programDescription,
      //logs: this._logsWriter.logs,
    };
  }

  private async getSyntacticDetectionTechnique(): Promise<DetectionTechniqueGenerated> {
    return this._programGenerator.generateProgram();
  }

  public setAborted(): void {
    this._programGenerator.setAborted();
  }

  getAiService(): AIService {
    return this._aiService;
  }

  public assessTokensUsage(): TokensUsed {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const token of this.tokensUsed) {
      totalInputTokens += token.input;
      totalOutputTokens += token.output;
    }
    for (const token of this._programGenerator.tokensUsed) {
      totalInputTokens += token.input;
      totalOutputTokens += token.output;
    }
    return {
      input: totalInputTokens,
      output: totalOutputTokens,
    };
  }
}
