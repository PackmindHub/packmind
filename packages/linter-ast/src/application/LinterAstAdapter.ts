import { ILinterAstPort, ASTNode } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { ParserRegistry } from '../core/ParserRegistry';
import { ParserNotAvailableError } from '../core/ParserError';
import { ConsoleLogRemovalService } from './ConsoleLogRemovalService';

export class LinterAstAdapter implements ILinterAstPort {
  private readonly registry: ParserRegistry;
  private readonly consoleRemovalService: ConsoleLogRemovalService;

  constructor() {
    this.registry = new ParserRegistry();
    this.consoleRemovalService = new ConsoleLogRemovalService();
  }

  async parseSourceCode(
    sourceCode: string,
    language: ProgrammingLanguage,
  ): Promise<ASTNode> {
    const languageKey = this.mapLanguageToParserKey(language);
    if (!languageKey) {
      throw new ParserNotAvailableError(language);
    }

    const parser = await this.registry.getParser(languageKey);
    return parser.parse(sourceCode);
  }

  isLanguageSupported(language: ProgrammingLanguage): boolean {
    const languageKey = this.mapLanguageToParserKey(language);
    return languageKey !== null;
  }

  getAvailableLanguages(): ProgrammingLanguage[] {
    return [
      ProgrammingLanguage.TYPESCRIPT,
      ProgrammingLanguage.TYPESCRIPT_TSX,
      ProgrammingLanguage.JAVASCRIPT,
      ProgrammingLanguage.JAVASCRIPT_JSX,
      ProgrammingLanguage.CPP,
      ProgrammingLanguage.GO,
      ProgrammingLanguage.KOTLIN,
      ProgrammingLanguage.CSS,
      ProgrammingLanguage.CSHARP,
      ProgrammingLanguage.PHP,
      ProgrammingLanguage.PYTHON,
      ProgrammingLanguage.RUBY,
      ProgrammingLanguage.JSON,
      ProgrammingLanguage.HTML,
      ProgrammingLanguage.JAVA,
      ProgrammingLanguage.SWIFT,
      ProgrammingLanguage.SCSS,
      ProgrammingLanguage.YAML,
    ];
  }

  async removeConsoleStatements(
    sourceCode: string,
    language: ProgrammingLanguage,
  ): Promise<string> {
    return this.consoleRemovalService.removeConsoleLogStatements(
      sourceCode,
      language,
    );
  }

  private mapLanguageToParserKey(language: ProgrammingLanguage): string | null {
    const mapping: Partial<Record<ProgrammingLanguage, string>> = {
      [ProgrammingLanguage.TYPESCRIPT]: 'typescript',
      [ProgrammingLanguage.TYPESCRIPT_TSX]: 'typescript',
      [ProgrammingLanguage.JAVASCRIPT]: 'javascript',
      [ProgrammingLanguage.JAVASCRIPT_JSX]: 'javascript',
      [ProgrammingLanguage.CPP]: 'cpp',
      [ProgrammingLanguage.GO]: 'go',
      [ProgrammingLanguage.KOTLIN]: 'kotlin',
      [ProgrammingLanguage.CSS]: 'css',
      [ProgrammingLanguage.CSHARP]: 'csharp',
      [ProgrammingLanguage.PHP]: 'php',
      [ProgrammingLanguage.PYTHON]: 'python',
      [ProgrammingLanguage.RUBY]: 'ruby',
      [ProgrammingLanguage.JSON]: 'json',
      [ProgrammingLanguage.HTML]: 'html',
      [ProgrammingLanguage.JAVA]: 'java',
      [ProgrammingLanguage.SWIFT]: 'swift',
      [ProgrammingLanguage.SCSS]: 'scss',
      [ProgrammingLanguage.YAML]: 'yaml',
    };
    return mapping[language] || null;
  }
}
