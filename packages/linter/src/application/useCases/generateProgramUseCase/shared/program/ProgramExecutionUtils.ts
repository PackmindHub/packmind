import AbstractGenerationStrategy from './strategy/AbstractGenerationStrategy';
import { SourceCodeRepresentation } from './AbstractRuleDetectionProgram';
import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import { ILinterAstPort } from '@packmind/types';
import {
  callIndexJsWithInput,
  deleteFile,
  writeFileContent,
} from '../utils/IO';
import { RuleId } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { stripVTControlCharacters } from 'node:util';
import Globals from '../utils/Globals';

const logger = new PackmindLogger('ProgramExecutionUtils');

export function extractStringOrObjectOfString(
  input: string | object[],
): string {
  // Check if the input is a string
  if (typeof input === 'string') {
    return input;
  }

  // Check if the input is an array of objects
  if (
    Array.isArray(input) &&
    input.every((item) => typeof item === 'object' && item !== null)
  ) {
    return input
      .map((obj) => {
        // Convert each object to a plain text representation
        return Object.entries(obj)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
      })
      .join('\n');
  }

  // Default case, return an empty string or handle error case as needed
  return '';
}

export function extractionsViolationsFromRawOutput(output: string): number[] {
  try {
    if (!output?.length) {
      logger.error(`No output frrom the program - return`);
      return [];
    }
    // Convert the output to a string and trim any extra whitespace.
    const outputString = output.toString().trim();
    // Remove ANSI/VT control characters first (before finding bracket position)
    const stringWithoutAnsi = stripVTControlCharacters(outputString);
    // Find the last occurrence of the opening bracket "[".
    const lastBracketIndex = stringWithoutAnsi.lastIndexOf('[');
    // Extract the substring starting from the last bracket to the end.
    const jsonString = stringWithoutAnsi.substring(lastBracketIndex).trim();
    // Parse the extracted substring as JSON.
    const stringWithoutLineBreaks = jsonString
      .replace(/\\n/g, '')
      .replace(/\\t/g, '')
      .replace(/\\r/g, '');
    const numbers: number[] = JSON.parse(stringWithoutLineBreaks);
    // Deduplicate and sort line numbers
    const validNumbers = numbers.filter((n) => n >= 0);
    const uniqueNumbers = [...new Set(validNumbers)].sort((a, b) => a - b);
    return uniqueNumbers;
  } catch (error) {
    logger.error(
      `Error while parsing the output as JSON. Original output: "${output}" | ` +
        `Extracted JSON string: "${output.toString().trim().substring(output.toString().trim().lastIndexOf('['))}" | ` +
        `Character codes: [${Array.from(output)
          .map((c) => c.charCodeAt(0))
          .join(', ')}] | ` +
        `Error: ${getErrorMessage(error)}`,
    );
    return [];
  }
}

/**
 * Extracts violations from raw output for multiple practices
 * The output is expected to be a JSON map where keys are practice IDs and values are arrays of line numbers
 * @param output The raw output from the program execution
 * @returns A map where keys are practice IDs and values are arrays of line numbers
 */
export function extractViolationsFromRawOutputForMultipleRules(
  output: string,
): Map<string, number[]> {
  try {
    if (!output?.length) {
      logger.error(`No output from the program - return empty map`);
      return new Map<string, number[]>();
    }
    // Convert the output to a string and trim any extra whitespace
    const outputString = output.toString().trim();

    // Remove ANSI/VT control characters first (before finding curly brace position)
    const stringWithoutAnsi = stripVTControlCharacters(outputString);

    // Find the last occurrence of the opening curly brace "{"
    const lastCurlyBraceIndex = stringWithoutAnsi.lastIndexOf('{');
    if (lastCurlyBraceIndex === -1) {
      logger.error(`No JSON object found in the output: ${output}`);
      return new Map<string, number[]>();
    }

    // Extract the substring starting from the last curly brace to the end
    const jsonString = stringWithoutAnsi.substring(lastCurlyBraceIndex).trim();

    // Clean the string from escape characters
    const stringWithoutLineBreaks = jsonString
      .replace(/\\n/g, '')
      .replace(/\\t/g, '')
      .replace(/\\r/g, '');

    // Parse the extracted substring as JSON
    const violationsMap = JSON.parse(stringWithoutLineBreaks);

    // Convert the plain object to a Map
    const resultMap = new Map<string, number[]>();
    for (const [ruleId, violations] of Object.entries(violationsMap)) {
      const validViolations = (violations as number[]).filter((n) => n >= 0);
      const uniqueViolations = [...new Set(validViolations)].sort(
        (a, b) => a - b,
      );
      resultMap.set(ruleId, uniqueViolations);
    }

    return resultMap;
  } catch (error) {
    logger.error(
      `Error while parsing the output as JSON map: ${output}, Error: ${error}`,
    );
    return new Map<string, number[]>();
  }
}

export async function executeProgramInProductionMode(
  ruleId: RuleId,
  programPath: string,
  inputCodeRepresentation: SourceCodeRepresentation,
  filePath: string,
): Promise<number[]> {
  try {
    const output: string = await callIndexJsWithInput(
      programPath,
      inputCodeRepresentation.content,
    );
    const outputString = output.toString().trim();
    const outputArrayUniques = extractionsViolationsFromRawOutput(outputString);
    return outputArrayUniques;
  } catch (error) {
    logger.error(
      `The program has run the following error in production mode for rule ${ruleId} and file ${filePath}: ${getErrorMessage(error)}`,
    );
    return [];
  }
}

export async function executeProgramInDebugMode(
  programPath: string,
  inputForProgram: SourceCodeRepresentation,
): Promise<number[]> {
  const output: string = await callIndexJsWithInput(
    programPath,
    inputForProgram.content,
  );
  const outputString = output.toString().trim();
  const outputArrayUniques = extractionsViolationsFromRawOutput(outputString);
  return outputArrayUniques;
}

export async function writeProgram(
  program: string,
  ruleId: RuleId,
  generationStrategy: AbstractGenerationStrategy,
): Promise<string> {
  const suffix: string = await generationStrategy.getSuffixCode();
  const fileContent = `${program}\n${suffix}`;
  const programPath = `${Globals.JS_PLAYGROUND_PATH}/${generateRandomAlphanumeric(24)}.js`;
  await writeFileContent(fileContent, programPath);
  logger.debug(`Program has been written to temporary file ${programPath}`);
  return programPath;
}

export const RUNTIME_DIRECTORIES = {
  CPP: 'cpp',
  CSS: 'css',
  CSHARP: 'csharp',
  GENERIC: 'generic',
  GO: 'go',
  HTML: 'html',
  JAVA: 'java',
  JAVASCRIPT: 'js',
  JSON: 'json',
  KOTLIN: 'kotlin',
  PHP: 'php',
  PYTHON: 'python',
  RUBY: 'ruby',
  SCSS: 'scss',
  SQL: 'sql',
  SWIFT: 'swift',
  TYPESCRIPT: 'ts',
  TYPESCRIPT_JSX: 'tsx',
  YAML: 'yaml',
};

export function getLanguageDirectory(language: ProgrammingLanguage) {
  switch (language) {
    case 'JAVASCRIPT':
      return RUNTIME_DIRECTORIES.JAVASCRIPT;
    case 'TYPESCRIPT':
      return RUNTIME_DIRECTORIES.TYPESCRIPT;
    case 'TYPESCRIPT_TSX':
      return RUNTIME_DIRECTORIES.TYPESCRIPT_JSX;
    case 'JAVA':
      return RUNTIME_DIRECTORIES.JAVA;
    case 'PYTHON':
      return RUNTIME_DIRECTORIES.PYTHON;
    case 'PHP':
      return RUNTIME_DIRECTORIES.PHP;
    case 'CSS':
      return RUNTIME_DIRECTORIES.CSS;
    case 'SCSS':
      return RUNTIME_DIRECTORIES.SCSS;
    case 'CSHARP':
      return RUNTIME_DIRECTORIES.CSHARP;
    case 'KOTLIN':
      return RUNTIME_DIRECTORIES.KOTLIN;
    case 'GO':
      return RUNTIME_DIRECTORIES.GO;
    case 'HTML':
      return RUNTIME_DIRECTORIES.HTML;
    case 'YAML':
      return RUNTIME_DIRECTORIES.YAML;
    case 'RUBY':
      return RUNTIME_DIRECTORIES.RUBY;
    case 'JSON':
      return RUNTIME_DIRECTORIES.JSON;
    case 'SWIFT':
      return RUNTIME_DIRECTORIES.SWIFT;
    case 'CPP':
      return RUNTIME_DIRECTORIES.CPP;
    default:
      logger.info(`Use generic directory for language ${language}`);
      return RUNTIME_DIRECTORIES.GENERIC;
  }
}

export function getMarkdownLanguage(language: ProgrammingLanguage) {
  if (language === 'GENERIC') {
    logger.error(`Markdown language not found for ${language}`);
    return '';
  }
  return language.toLowerCase();
}

export function generateRandomAlphanumeric(size = 10) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

// Not async since we don't need to wait
export function deleteProgram(programPath: string) {
  // Delete the program file
  deleteFile(programPath);
}

export async function executeCombinedProgramInProductionMode(
  programPath: string,
  input: string,
): Promise<Map<string, number[]>> {
  try {
    const output: string = await callIndexJsWithInput(programPath, input);
    const outputString = output.toString().trim();
    const violationsMap =
      extractViolationsFromRawOutputForMultipleRules(outputString);
    return violationsMap;
  } catch (error) {
    logger.error(`Error executing combined program: ${error}`);
    return new Map<string, number[]>();
  }
}

export async function clearConsoleLogFromProgramOutput(
  programFunction: string,
  linterAstAdapter: ILinterAstPort | null,
): Promise<string> {
  // If no adapter is provided, return the original code unchanged
  if (!linterAstAdapter) {
    logger.error(`linterAstAdapter is null`);
    return programFunction;
  }

  try {
    logger.info(`Clean up program to remove console.log`);
    // Use the AST adapter's console removal service
    return await linterAstAdapter.removeConsoleStatements(
      programFunction,
      ProgrammingLanguage.JAVASCRIPT,
    );
  } catch (error) {
    // If parsing fails, return the original code unchanged
    logger.error(`Failed to remove console statements: ${error}`);
    return programFunction;
  }
}
