import { SourceCodeRepresentation } from '../AbstractRuleDetectionProgram';
import { TokensUsed } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { SourceCodeState } from '@packmind/types';

export default abstract class AbstractGenerationStrategy {
  protected _tokensUsed: TokensUsed[] = [];
  protected _initialPrompt = '';

  abstract getInitialProgram(): Promise<string>;

  get initialPrompt(): string {
    return this._initialPrompt;
  }

  get tokensUsed(): TokensUsed[] {
    return this._tokensUsed;
  }

  abstract getFileInputFromContent(
    fileContent: string,
    language: ProgrammingLanguage,
  ): Promise<SourceCodeRepresentation>;

  abstract getSuffixCode(): Promise<string>;

  abstract getSuffixCodeForMultiplePrograms(): Promise<string>;

  abstract getSourceCodeState(): SourceCodeState;
}
