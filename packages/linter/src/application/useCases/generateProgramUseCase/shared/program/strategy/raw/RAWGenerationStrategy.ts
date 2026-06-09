import AbstractGenerationStrategy from '../AbstractGenerationStrategy';
import { generate_program_code } from './generate_program_code';
import { parseCodeOrJsonFromAIAnswer } from '../../ProgramOutputUtils';
import { SourceCodeRepresentation } from '../../AbstractRuleDetectionProgram';
import { DetectionProgramRuleInput } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import { AI_RESPONSE_FORMAT, AIService } from '@packmind/types';
import {
  getBadExamplesCode,
  getGoodExamplesCode,
} from '../../../utils/PromptUtils';
import { getFileContent } from '../../../utils/IO';
import Globals from '../../../utils/Globals';
import { SourceCodeState } from '@packmind/types';

const origin = 'RAWGenerationStrategy';
export default class RAWGenerationStrategy extends AbstractGenerationStrategy {
  constructor(
    private readonly _detectionProgramRuleInput: DetectionProgramRuleInput,
    private readonly _aiProvider: AIService,
    private readonly _logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super();
  }

  async getInitialProgram(): Promise<string> {
    this._logger.info(
      `[${this._detectionProgramRuleInput.rule.id}] =====  Create Initial Program For RAW Mode`,
    );

    const promptToGenerateProgram = this.buildPromptWithCode();

    this._initialPrompt = promptToGenerateProgram;

    const MAX_RETRY = 5;
    let i = 0;

    while (i < MAX_RETRY) {
      const response = await this._aiProvider.executePrompt(
        promptToGenerateProgram,
        {
          responseFormat: AI_RESPONSE_FORMAT.PLAIN_TEXT,
        },
      );
      if (response.tokensUsed) {
        this._tokensUsed.push(response.tokensUsed);
      }

      try {
        if (!response.data) {
          throw new Error('No data returned by AI');
        }
        return parseCodeOrJsonFromAIAnswer(response.data);
      } catch (error) {
        this._logger.error(getErrorMessage(error));
      }
      i++;
    }
    throw new Error(
      'Failed to create Initial Program for RAW Mode - MAX_TRY reached',
    );
  }

  private buildPromptWithCode(): string {
    const formattedHeuristics =
      this._detectionProgramRuleInput.heuristics &&
      this._detectionProgramRuleInput.heuristics.length > 0
        ? this._detectionProgramRuleInput.heuristics
            .map((h) => `* ${h}`)
            .join('\n')
        : '';
    return generate_program_code
      .replace('$RULE_CONTENT', this._detectionProgramRuleInput.rule.content)
      .replace('$RULE_HEURISTICS$', formattedHeuristics)
      .replace('$RULE_LANGUAGE$', this._detectionProgramRuleInput.language)
      .replace(
        '$RULE_BAD_EXAMPLES$',
        getBadExamplesCode(this._detectionProgramRuleInput.ruleExamples),
      )
      .replace(
        '$RULE_GOOD_EXAMPLES$',
        getGoodExamplesCode(this._detectionProgramRuleInput.ruleExamples),
      );
  }

  async getFileInputFromContent(
    fileContent: string,
  ): Promise<SourceCodeRepresentation> {
    return {
      content: fileContent,
      sourceCodeState: 'RAW',
    };
  }

  async getSuffixCode(): Promise<string> {
    return getFileContent(`${Globals.JS_PLAYGROUND_PATH}/suffix_code.js`);
  }

  async getSuffixCodeForMultiplePrograms(): Promise<string> {
    return getFileContent(`${Globals.JS_PLAYGROUND_PATH}/suffix_code_multi.js`);
  }

  getSourceCodeState(): SourceCodeState {
    return 'RAW';
  }
}
