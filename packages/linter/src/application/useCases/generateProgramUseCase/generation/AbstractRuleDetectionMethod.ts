import DetectionToolingLogWriter from '../log/DetectionToolingLogWriter';
import { PackmindLogger } from '@packmind/logger';
import {
  AIService,
  PromptConversation,
  PromptConversationRole,
  TokensUsed,
} from '@packmind/node-utils';
//import { getBadExamplesCode, getGoodExamplesCode } from '../utils/PromptUtils';
import { DetectionProgramRuleInput } from '@packmind/types';

const origin = 'AbstractRuleDetectionMethod';

export abstract class AbstractRuleDetectionMethod {
  protected _conversations: PromptConversation[] = [];
  protected _tokensUsed: TokensUsed[] = [];
  protected _context: string;
  protected _aborted = false;

  constructor(
    protected readonly _detectionProgramRule: DetectionProgramRuleInput,
    protected readonly _aiService: AIService,
    protected readonly _logsWriter: DetectionToolingLogWriter,
    protected readonly _logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this._context = '';
  }

  protected clearConversations() {
    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] Clear conversations`,
    );
    this._conversations = [];
  }

  protected clearConversationsAndKeepOriginalInstructions() {
    this._logger.info(
      `[${this._detectionProgramRule.rule.id}] Clear conversations And Keep Original Instructions`,
    );
    const contextOfTheConversation = this._conversations[0];
    this._conversations = [contextOfTheConversation];
  }

  protected async resetConversationWithContext() {
    this.clearConversations();
    this.addMessageToConversation(this._context, PromptConversationRole.USER);
  }

  protected addMessageToConversation(
    prompt: string,
    role: PromptConversationRole,
  ) {
    this._conversations.push({
      role,
      message: prompt,
    });
  }

  protected abstract getMethodType(): string;

  get tokensUsed(): TokensUsed[] {
    return this._tokensUsed;
  }

  setAborted() {
    this._aborted = true;
  }
}
