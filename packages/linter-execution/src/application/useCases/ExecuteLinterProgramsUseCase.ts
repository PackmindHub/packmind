import { LinterAstAdapter } from '@packmind/linter-ast';
import { ASTNode, ILinterAstPort } from '@packmind/types';
import {
  ProgrammingLanguage,
  ExecuteLinterProgramsCommand,
  ExecuteLinterProgramsResult,
  IExecuteLinterProgramsUseCase,
  LinterExecutionProgram,
  LinterExecutionViolation,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';

const origin = 'ExecuteLinterProgramsUseCase';

export class ExecuteLinterProgramsUseCase implements IExecuteLinterProgramsUseCase {
  constructor(
    private readonly linterAstAdapter: ILinterAstPort = new LinterAstAdapter(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async execute(
    command: ExecuteLinterProgramsCommand,
  ): Promise<ExecuteLinterProgramsResult> {
    const { filePath, fileContent, language, programs } = command;

    if (programs.length === 0) {
      return {
        file: filePath,
        violations: [],
      };
    }

    // Filter programs to only those matching the file's language
    const matchingPrograms = this.filterProgramsByLanguage(programs, language);

    if (matchingPrograms.length === 0) {
      return {
        file: filePath,
        violations: [],
      };
    }

    const violations: LinterExecutionViolation[] = [];
    this.extractAndExecutePrograms(matchingPrograms, fileContent, violations);
    await this.extractAndExecuteASTPrograms(
      matchingPrograms,
      language,
      filePath,
      fileContent,
      violations,
    );

    return {
      file: filePath,
      violations,
    };
  }

  private async extractAndExecuteASTPrograms(
    programs: LinterExecutionProgram[],
    language: ProgrammingLanguage,
    filePath: string,
    fileContent: string,
    violations: LinterExecutionViolation[],
  ) {
    const astPrograms = programs.filter((p) => p.sourceCodeState === 'AST');
    if (astPrograms.length > 0) {
      if (!this.linterAstAdapter.isLanguageSupported(language)) {
        this.logger.warn('Unsupported language for AST execution', {
          language,
          filePath,
        });
      } else {
        let ast: ASTNode;
        try {
          ast = await this.linterAstAdapter.parseSourceCode(
            fileContent,
            language,
          );
          const astViolations = astPrograms.flatMap((program) =>
            this.executeAstProgram(program, ast),
          );
          violations.push(...astViolations);
        } catch (error) {
          this.logger.error('Failed to parse source code for AST execution', {
            language,
            filePath,
            error: this.normalizeError(error),
          });
        }
      }
    }
  }

  private extractAndExecutePrograms(
    programs: LinterExecutionProgram[],
    fileContent: string,
    violations: LinterExecutionViolation[],
  ) {
    const rawPrograms = programs.filter((p) => p.sourceCodeState === 'RAW');
    if (rawPrograms.length > 0) {
      const rawViolations = rawPrograms.flatMap((program) =>
        this.executeRawProgram(program, fileContent),
      );
      violations.push(...rawViolations);
    }
  }

  private executeRawProgram(
    program: LinterExecutionProgram,
    fileContent: string,
  ): LinterExecutionViolation[] {
    const ruleName = this.extractRuleName(program.ruleContent);

    try {
      const checkSourceCode = this.createProgramFunction(program.code);
      const rawResult = checkSourceCode(fileContent);

      return this.mapProgramResult(rawResult, ruleName, program);
    } catch (error) {
      this.logger.error('Failed to execute detection program', {
        standardSlug: program.standardSlug,
        ruleContent: program.ruleContent,
        error: this.normalizeError(error),
      });
      return [];
    }
  }

  private executeAstProgram(
    program: LinterExecutionProgram,
    ast: ASTNode,
  ): LinterExecutionViolation[] {
    const ruleName = this.extractRuleName(program.ruleContent);

    try {
      const checkSourceCode = this.createProgramFunction(program.code);
      const rawResult = checkSourceCode(ast);

      return this.mapProgramResult(rawResult, ruleName, program);
    } catch (error) {
      this.logger.error('Failed to execute detection program', {
        standardSlug: program.standardSlug,
        ruleContent: program.ruleContent,
        error: this.normalizeError(error),
      });
      return [];
    }
  }

  private createProgramFunction(
    program: string,
  ): (input: ASTNode | string) => unknown[] | number[] {
    try {
      const func = new Function(
        'input',
        `
          ${program}
          return checkSourceCode(input);
        `,
      );
      return func as (input: ASTNode | string) => unknown[] | number[];
    } catch (error) {
      throw new Error(`Failed to parse program: ${this.normalizeError(error)}`);
    }
  }

  private mapProgramResult(
    rawResult: unknown,
    ruleName: string,
    program: LinterExecutionProgram,
  ): LinterExecutionViolation[] {
    if (!Array.isArray(rawResult)) {
      this.logger.warn('Program result is not an array', {
        standardSlug: program.standardSlug,
        ruleContent: program.ruleContent,
      });
      return [];
    }

    return rawResult
      .map((value) => this.toViolation(value, ruleName, program))
      .filter(
        (violation): violation is LinterExecutionViolation =>
          violation !== null,
      );
  }

  private toViolation(
    value: unknown,
    ruleName: string,
    program: LinterExecutionProgram,
  ): LinterExecutionViolation | null {
    let line: number | undefined;
    let character = 0;

    // Detection programs return 0-indexed line numbers, convert to 1-indexed for display
    if (typeof value === 'number' && Number.isFinite(value)) {
      line = value + 1;
    } else if (this.isViolationLike(value)) {
      line = value.line + 1;
      character = value.character ?? 0;
    }

    if (!this.isValidLine(line)) {
      this.logger.warn('Invalid violation line detected', {
        standardSlug: program.standardSlug,
        ruleContent: program.ruleContent,
        line,
      });
      return null;
    }

    return {
      line,
      character,
      rule: ruleName,
      standard: program.standardSlug,
    };
  }

  private isViolationLike(
    value: unknown,
  ): value is { line: number; character?: number } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'line' in value &&
      typeof (value as { line: unknown }).line === 'number'
    );
  }

  private isValidLine(line: number | undefined): line is number {
    return typeof line === 'number' && Number.isInteger(line) && line >= 0;
  }

  private extractRuleName(ruleContent: string): string {
    // Only extract from path if it looks like a file path (ends with .js)
    if (ruleContent.endsWith('.js') && ruleContent.includes('/')) {
      return ruleContent.split('/').pop()?.replace('.js', '') ?? ruleContent;
    }
    return ruleContent;
  }

  private filterProgramsByLanguage(
    programs: LinterExecutionProgram[],
    fileLanguage: ProgrammingLanguage,
  ): LinterExecutionProgram[] {
    const filtered = programs.filter((p) => p.language === fileLanguage);

    if (filtered.length < programs.length) {
      this.logger.debug('Filtered out programs with mismatched languages', {
        totalPrograms: programs.length,
        matchingPrograms: filtered.length,
        fileLanguage,
      });
    }

    return filtered;
  }

  private normalizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object') {
      // Some libraries throw objects with a message property instead of Error instances
      if (
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
      ) {
        return (error as { message: string }).message;
      }

      try {
        return JSON.stringify(error);
      } catch {
        return '[object Object]';
      }
    }

    return String(error);
  }
}
