import { BaseParser } from './BaseParser';
import { ParserNotAvailableError } from './ParserError';
import TypeScriptParser from '../parsers/TypeScriptParser';
import JavaScriptParser from '../parsers/JavaScriptParser';
import CPPParser from '../parsers/CPPParser';
import GoParser from '../parsers/GoParser';
import KotlinParser from '../parsers/KotlinParser';
import CSSParser from '../parsers/CSSParser';
import CSharpParser from '../parsers/CSharpParser';
import PHPParser from '../parsers/PHPParser';
import PythonParser from '../parsers/PythonParser';
import RubyParser from '../parsers/RubyParser';
import JSONParser from '../parsers/JSONParser';
import HTMLParser from '../parsers/HTMLParser';
import JavaParser from '../parsers/JavaParser';
import SwiftParser from '../parsers/SwiftParser';
import SCSSParser from '../parsers/SCSSParser';
import YAMLParser from '../parsers/YAMLParser';

export class ParserRegistry {
  private parsers = new Map<string, BaseParser>();
  private parserClasses: Record<string, new () => BaseParser> = {
    typescript: TypeScriptParser,
    javascript: JavaScriptParser,
    cpp: CPPParser,
    go: GoParser,
    kotlin: KotlinParser,
    css: CSSParser,
    csharp: CSharpParser,
    php: PHPParser,
    python: PythonParser,
    ruby: RubyParser,
    json: JSONParser,
    html: HTMLParser,
    java: JavaParser,
    swift: SwiftParser,
    scss: SCSSParser,
    yaml: YAMLParser,
  };

  async getParser(language: string): Promise<BaseParser> {
    const cached = this.parsers.get(language);
    if (cached) {
      return cached;
    }

    const ParserClass = this.parserClasses[language];
    if (!ParserClass) {
      throw new ParserNotAvailableError(language);
    }

    const parser = new ParserClass();
    await parser.initialize();
    this.parsers.set(language, parser);
    return parser;
  }

  getAvailableParsers(): string[] {
    return Object.keys(this.parserClasses);
  }

  clearCache(): void {
    this.parsers.clear();
  }
}
