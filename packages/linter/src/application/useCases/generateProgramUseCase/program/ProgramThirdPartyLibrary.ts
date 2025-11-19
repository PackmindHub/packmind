import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import { ILinterAstPort } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { DetectionProgramRuleInput } from '@packmind/types';

const logger = new PackmindLogger('ProgramThirdPartyLibrary');

export async function buildPromptForExternalLibraries(
  rule: DetectionProgramRuleInput,
  linterAstAdapter?: ILinterAstPort | null,
): Promise<string> {
  try {
    const areInputExamplesValid = await checkIfExamplesCanBeParsed(
      rule,
      linterAstAdapter,
    );
    if (areInputExamplesValid) {
      logger.info(
        `[${rule.rule.id}] All examples have been assessed, third party libraries are allowed for external parsings`,
      );
      return buildPromptForExternalLibrariesIfCodeIsValid(rule.language);
    } else {
      logger.info(
        `[${rule.rule.id}] All examples can not be parsed, third party libraries are not allowed for external parsings`,
      );
      return buildPromptCannotUseExternalLibraries();
    }
  } catch (error) {
    logger.error(
      `[${rule.rule.id}] Error while building prompt for external libraries: ${getErrorMessage(error)}`,
    );
    logger.info(
      `[${rule.rule.id}] All examples can not be parsed, third party libraries are not allowed for external parsings`,
    );
    return buildPromptCannotUseExternalLibraries();
  }
}

function buildPromptCannotUseExternalLibraries(): string {
  return `You cannot use any third-party libraries to parse the code.
Based on the string input, you're free to manipulate it as much as you want, but can not rely on any external libraries.`;
}

async function checkIfExamplesCanBeParsed(
  rule: DetectionProgramRuleInput,
  linterAstAdapter?: ILinterAstPort | null,
): Promise<boolean> {
  try {
    for (const pairOfCodeExamples of rule.ruleExamples) {
      if (pairOfCodeExamples.positive?.length) {
        await parseCodeWithExternalLib(
          pairOfCodeExamples.positive,
          rule.language,
          linterAstAdapter,
        );
      }
      if (pairOfCodeExamples.negative?.length) {
        await parseCodeWithExternalLib(
          pairOfCodeExamples.negative,
          rule.language,
          linterAstAdapter,
        );
      }
    }
    return true;
  } catch (error) {
    logger.error(
      `[${rule.rule.id}] Error while parsing the examples for rule: ${getErrorMessage(error)}`,
    );
    return false;
  }
}

//Check first if the examples can be parsed using tree-sitter
export function buildPromptForExternalLibrariesIfCodeIsValid(
  language: ProgrammingLanguage,
): string {
  const beginPrompt = `Keep in mind the following npm libraries can be used:`;

  const endPrompt = `Don't assume the existence of some others third-party libraries, as they won't be available.
Using AST visitors is not mandatory, you can use alternative methods to parse the code, such as regular expressions or string manipulation.`;

  let languageSpecificLibs = '';
  switch (language) {
    case 'YAML':
      languageSpecificLibs = `- 'yaml' to parse YAML files.
            Reminder on how to use it:
                 const YAML = require('yaml')
                 YAML.parse("sourcecode");
                 //or, if the code contains multiple documents:
                 YAML.parseAllDocuments("sourcecode");`;
  }
  if (languageSpecificLibs.length) {
    return `${beginPrompt}
${languageSpecificLibs}
You should NOT use any other third-party libraries.
${endPrompt}`;
  } else {
    return `You should NOT use any third-party libraries`;
  }
}

export async function checkIfSourceCodeParsableWithAST(
  rule: DetectionProgramRuleInput,
  linterAstAdapter?: ILinterAstPort | null,
): Promise<boolean> {
  if (!linterAstAdapter) {
    return false;
  }

  return (
    linterAstAdapter.isLanguageSupported(rule.language) &&
    checkIfExamplesCanBeParsed(rule, linterAstAdapter)
  );
}

async function parseCodeWithExternalLib(
  code: string,
  language: ProgrammingLanguage,
  linterAstAdapter?: ILinterAstPort | null,
): Promise<void> {
  if (language === 'GENERIC') {
    throw new Error('Generic examples cannot be parsed');
  }

  // Try using linter-ast adapter first if available and language is supported
  if (linterAstAdapter?.isLanguageSupported(language)) {
    try {
      await linterAstAdapter.parseSourceCode(code, language);
      return; // Successfully parsed with linter-ast
    } catch (error) {
      throw new Error(`Error while parsing the examples ${error}`);
    }
  }

  throw new Error(
    `Source code in language=${language} is not supported yet in AST MODE`,
  );
}
