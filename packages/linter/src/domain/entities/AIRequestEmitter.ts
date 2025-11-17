import { PackmindLogger } from '@packmind/logger';
import {
  AI_RESPONSE_FORMAT,
  AIPromptOptions,
  AIService,
  getErrorMessage,
  PromptConversation,
  TokensUsedByOperation,
} from '@packmind/node-utils';

const origin = 'AIRequestEmitter';

export default abstract class AIRequestEmitter {
  private readonly ERROR_ICON: string = '🟥';
  private readonly _tokens: TokensUsedByOperation[] = [];

  constructor(
    protected _taskId: string,
    protected readonly _aiService: AIService,
    protected readonly _logger = new PackmindLogger(origin),
  ) {}

  public abstract getOperationType(): string;

  public async callAiProvider(
    prompt: PromptConversation[],
    options: AIPromptOptions = {},
  ) {
    const MAX_RETRY = 2;
    let i = 0;

    // Set default responseFormat to PLAIN_TEXT if not specified
    const optionsWithDefaults: AIPromptOptions = {
      responseFormat: AI_RESPONSE_FORMAT.PLAIN_TEXT,
      ...options,
    };

    while (i <= MAX_RETRY) {
      try {
        const response = await this.getAiService().executePromptWithHistory(
          prompt,
          optionsWithDefaults,
        );
        this._tokens.push({
          input: response.tokensUsed?.input || 0,
          output: response.tokensUsed?.output || 0,
          operation: this.getOperationType(),
        });
        return response;
      } catch (error) {
        // It might be a temporary error, especially if we are hitting too many requests within a minute
        // Most AI Providers have Token Per Minute limits
        // So we will retry the request at most 3 times, and will wait 10 seconds between each retry
        let message = `${this.ERROR_ICON} Error when calling AI Provider - ${getErrorMessage(error)}`;
        this._logger.error(
          `[${this._taskId}] Error when calling AI Provider ${message}`,
        );
        if (hasInnerError(error)) {
          //This display errors from Azure Open  AI in case of content filtering
          this._logger.error(
            `[${this._taskId}] Inner Error : ${JSON.stringify(error.innererror)}`,
          );
          message = `${message} ${JSON.stringify(error.innererror)}`;
        }
        if (i === MAX_RETRY) {
          throw new Error(
            `Multiple errors after requesting AI provider - ${message}`,
          );
        }
        i++;
      }
    }
  }

  public tokensUsed(): TokensUsedByOperation[] {
    return this._tokens.filter(
      (token) =>
        !isNaN(token.input) &&
        !isNaN(token.output) &&
        (token.input > 0 || token.output > 0),
    );
  }

  public getAiService(): AIService {
    return this._aiService;
  }
}

function hasInnerError(tbd: unknown): tbd is { innererror: unknown } {
  return (
    tbd !== null &&
    typeof tbd !== 'object' &&
    (tbd as { innererror: unknown })?.innererror !== undefined
  );
}
