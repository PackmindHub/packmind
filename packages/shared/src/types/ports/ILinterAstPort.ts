import { ProgrammingLanguage } from '../languages/Language';

export interface ASTNode {
  type: string;
  text: string;
  line: number;
  children: ASTNode[];
}

export interface ILinterAstPort {
  parseSourceCode(
    sourceCode: string,
    language: ProgrammingLanguage,
  ): Promise<ASTNode>;

  isLanguageSupported(language: ProgrammingLanguage): boolean;

  getAvailableLanguages(): ProgrammingLanguage[];
}
