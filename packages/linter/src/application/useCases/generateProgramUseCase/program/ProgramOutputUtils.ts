import Yaml from 'yaml';
import { PackmindLogger } from '@packmind/logger';

const logger = new PackmindLogger('ProgramOutputUtils');

export function parseOpenAIAnswerAsJsonObject(answer: string) {
  try {
    return JSON.parse(parseCodeOrJsonFromAIAnswer(answer));
  } catch {
    logger.error(`Error while parsing the answer as JSON: ${answer}`);
    throw new Error('JSON parsing error');
  }
}

export function parseOpenAIAnswerAsYamlObject(answer: string) {
  try {
    return Yaml.parse(answer);
  } catch {
    logger.warn(
      `Answer is not a raw YAML object, try to extract object from text`,
    );
    try {
      return Yaml.parse(parseCodeOrYamlFromAIAnswer(answer));
    } catch {
      logger.error(`Error while parsing the answer as YAML: ${answer}`);
      throw new Error('YAML parsing error');
    }
  }
}

export function parseCodeOrJsonFromAIAnswer(inputString: string): string {
  if (inputString.trim().startsWith(`function checkSourceCode`)) {
    return inputString;
  }

  // Updated regex to capture code blocks with optional language identifiers and inline code
  // Yes sometimes LLM returns code in Python
  const codeBlockRegex = /```(?:javascript|js|json|markdown)?\n([\s\S]*?)```/;
  const inlineCodeRegex = /`([\s\S]*?)`/g;

  // Match the first code block
  const codeBlockMatch = codeBlockRegex.exec(inputString);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // If no code block is found, fallback to the last inline code
  let lastInlineCode = '';
  let match;
  while ((match = inlineCodeRegex.exec(inputString)) !== null) {
    lastInlineCode = match[1].trim();
  }

  // Return the last inline code if available, otherwise return the input
  return lastInlineCode || inputString;
}

export function parseCodeOrYamlFromAIAnswer(inputString: string): string {
  const firstBacktickIndex = inputString.indexOf('```');
  const lastBacktickIndex = inputString.lastIndexOf('```');

  if (
    firstBacktickIndex !== -1 &&
    lastBacktickIndex !== -1 &&
    firstBacktickIndex < lastBacktickIndex
  ) {
    // Extract content between the first and last triple backticks
    let extractedCode = inputString
      .substring(firstBacktickIndex + 3, lastBacktickIndex)
      .trim();

    // Remove the first line if it contains only a language identifier
    const lines = extractedCode.split('\n');
    if (/^\s*\w+\s*$/.test(lines[0])) {
      lines.shift();
      extractedCode = lines.join('\n').trim();
    }

    return extractedCode;
  } else {
    return inputString;
  }
}
