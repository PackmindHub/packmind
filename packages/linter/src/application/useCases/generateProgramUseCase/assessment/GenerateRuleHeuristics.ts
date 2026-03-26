import AIRequestEmitter from '../../../../domain/entities/AIRequestEmitter';
import { DetectionProgramRuleInput } from '@packmind/types';
import { generate_rule_heuristics } from './prompts/generate_rule_heuristics';
import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import {
  AIService,
  PromptConversationRole,
  AI_RESPONSE_FORMAT,
} from '@packmind/types';
import { getBadExamplesCode, getGoodExamplesCode } from '../utils/PromptUtils';

const origin = 'GenerateRuleHeuristics';

export class GenerateRuleHeuristics extends AIRequestEmitter {
  constructor(
    protected readonly _taskId: string,
    protected readonly _aiService: AIService,
    protected readonly _logger = new PackmindLogger(origin),
  ) {
    super(_taskId, _aiService, _logger);
  }

  public async generateHeuristics(
    detectionProgramRuleInput: DetectionProgramRuleInput,
  ): Promise<string[]> {
    const prompt = this.buildPrompt(detectionProgramRuleInput);

    const MAX_RETRY = 3;
    let i = 0;
    while (i < MAX_RETRY) {
      try {
        const response = await this.callAiProvider(
          [
            {
              role: PromptConversationRole.USER,
              message: prompt,
            },
          ],
          {
            responseFormat: AI_RESPONSE_FORMAT.PLAIN_TEXT,
          },
        );

        if (!response?.data) {
          throw new Error('No data provided by AI');
        }

        // Split by newlines and filter out empty lines
        const heuristicsArray = response.data
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        this._logger.info(
          `Detection Heuristics for ruleId=${detectionProgramRuleInput.rule.id}:\n${response.data}`,
        );

        return heuristicsArray;
      } catch (error) {
        this._logger.error(
          `[TaskId=${this._taskId}] Error when generating detection heuristics for ruleId=${detectionProgramRuleInput.rule.id} ${detectionProgramRuleInput.rule.content} - ${getErrorMessage(error)}`,
        );
        i++;
      }
    }

    if (i >= MAX_RETRY) {
      this._logger.error(
        `[TaskId=${this._taskId}] Max retries reached for generating detection heuristics for ruleId=${detectionProgramRuleInput.rule.id} ${detectionProgramRuleInput.rule.content}`,
      );
    }
    throw new Error('Max retries reached for generating detection heuristics');
  }

  private buildPrompt(rule: DetectionProgramRuleInput): string {
    const ruleText = this.getRuleText(rule);
    return generate_rule_heuristics
      .replace('$CODING_RULE$', ruleText)
      .replace('$RULE_LANGUAGE$', rule.language);
  }

  private getRuleText(rule: DetectionProgramRuleInput): string {
    return `
Rule name: ${rule.rule.content}
Rule programming language: ${rule.language}
${getGoodExamplesCode(rule.ruleExamples)}
${getBadExamplesCode(rule.ruleExamples)}
`;
  }

  getOperationType(): string {
    return 'GENERATE_RULE_HEURISTICS';
  }
}
