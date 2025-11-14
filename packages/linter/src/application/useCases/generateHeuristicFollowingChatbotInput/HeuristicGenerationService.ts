import { PackmindLogger } from '@packmind/logger';
import {
  AI_RESPONSE_FORMAT,
  AIService,
  LLMModelPerformance,
  PromptConversationRole,
} from '@packmind/node-utils';
import { Rule, RuleExample } from '@packmind/types';
import AIRequestEmitter from '../../../domain/entities/AIRequestEmitter';
import { generate_heuristic_from_answer } from './prompts/generate_heuristic_from_answer';
import {
  getBadExamplesCode,
  getGoodExamplesCode,
} from '../generateProgramUseCase/utils/PromptUtils';

const origin = 'HeuristicGenerationService';

export class HeuristicGenerationService extends AIRequestEmitter {
  constructor(
    protected readonly _aiService: AIService,
    protected readonly _logger = new PackmindLogger(origin),
  ) {
    super('generate-heuristic-from-answer', _aiService, _logger);
  }

  public async generateHeuristic(
    rule: Rule,
    examples: RuleExample[],
    existingHeuristics: string[],
    question: string,
    answer: string,
  ): Promise<string> {
    const prompt = this.buildPrompt(
      rule,
      examples,
      existingHeuristics,
      question,
      answer,
    );

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
          AI_RESPONSE_FORMAT.PLAIN_TEXT,
          LLMModelPerformance.FAST,
        );

        if (!response?.data) {
          throw new Error('No data provided by AI');
        }

        // Ensure response.data is a string and trim it
        const heuristic =
          typeof response.data === 'string'
            ? response.data.trim()
            : String(response.data).trim();

        // Check if AI detected invalid/unrelated answer
        if (heuristic.toUpperCase() === 'EMPTY') {
          this._logger.warn(
            'No heuristic generated - user answer unrelated to rule',
            {
              question,
              answer,
              ruleId: rule.id,
            },
          );
          return '';
        }

        this._logger.info(`Generated heuristic: ${heuristic}`);

        return heuristic;
      } catch (error) {
        this._logger.error(
          `[TaskId=${this._taskId}] Error when generating heuristic for ruleId=${rule.id} - ${error instanceof Error ? error.message : String(error)}`,
        );
        i++;
      }
    }

    if (i >= MAX_RETRY) {
      this._logger.error(
        `[TaskId=${this._taskId}] Max retries reached for generating heuristic for ruleId=${rule.id}`,
      );
      throw new Error('Failed to generate heuristic after maximum retries');
    }

    // Should never reach here due to throw above, but TypeScript needs this
    throw new Error('Failed to generate heuristic');
  }

  private buildPrompt(
    rule: Rule,
    examples: RuleExample[],
    existingHeuristics: string[],
    question: string,
    answer: string,
  ): string {
    let prompt = generate_heuristic_from_answer;

    // Replace rule content
    prompt = prompt.replace('$RULE_CONTENT$', rule.content);

    // Replace examples
    const goodExamples = getGoodExamplesCode(examples);
    const badExamples = getBadExamplesCode(examples);
    prompt = prompt.replace(
      '$GOOD_EXAMPLES$',
      goodExamples || 'No good examples provided.',
    );
    prompt = prompt.replace(
      '$BAD_EXAMPLES$',
      badExamples || 'No bad examples provided.',
    );

    // Replace existing heuristics
    const heuristicsText =
      existingHeuristics.length > 0
        ? existingHeuristics.map((h, i) => `${i + 1}. ${h}`).join('\n')
        : 'No existing heuristics yet.';
    prompt = prompt.replace('$EXISTING_HEURISTICS$', heuristicsText);

    // Replace question and answer
    prompt = prompt.replace('$QUESTION$', question);
    prompt = prompt.replace('$ANSWER$', answer);

    return prompt;
  }

  getOperationType(): string {
    return 'GENERATE_HEURISTIC_FROM_CHATBOT_ANSWER';
  }
}
