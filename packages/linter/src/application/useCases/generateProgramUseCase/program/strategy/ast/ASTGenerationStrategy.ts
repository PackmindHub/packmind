import { buildPromptForExternalLibraries } from '../../ProgramThirdPartyLibrary';
import { convert_rule_guidelines_to_ast } from './convert_rule_guidelines_to_ast';
import AbstractGenerationStrategy from '../AbstractGenerationStrategy';
import YAML from 'yaml';
import { generate_program_for_ast_json } from './generate_program_for_ast_json';
import {
  parseCodeOrJsonFromAIAnswer,
  parseCodeOrYamlFromAIAnswer,
} from '../../ProgramOutputUtils';
import { SourceCodeRepresentation } from '../../AbstractRuleDetectionProgram';
import {
  getFullAstFromASourceCode,
  getPartialAstFromASourceCode,
} from './ASTUtils';
import { PackmindLogger } from '@packmind/logger';
import {
  AI_RESPONSE_FORMAT,
  AIService,
  PromptConversationRole,
  getErrorMessage,
} from '@packmind/node-utils';
import { ILinterAstPort } from '@packmind/types';
import { RuleExample } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { DetectionProgramRuleInput } from '@packmind/types';
import { getFileContent } from '../../../utils/IO';
import Globals from '../../../utils/Globals';
import { SourceCodeState } from '@packmind/types';

const origin = 'ASTGenerationStrategy';

export default class ASTGenerationStrategy extends AbstractGenerationStrategy {
  constructor(
    private readonly _detectionProgramRuleInput: DetectionProgramRuleInput,
    private readonly _aiService: AIService,
    private readonly _linterAstAdapter: ILinterAstPort | null = null,
    private readonly _logger = new PackmindLogger(origin),
  ) {
    super();
  }

  async getInitialProgram(): Promise<string> {
    this._logger.info(
      `[${this._detectionProgramRuleInput.rule.id}] =====  Generation Detection Guidelines for AST mode`,
    );

    const prompt =
      await this.convertRuleAndGuidelinesToPromptDedicatedToASTMode();

    const MAX_RETRY = 5;
    let i = 0;

    while (i < MAX_RETRY) {
      const response = await this._aiService.executePromptWithHistory(
        [
          {
            role: PromptConversationRole.USER,
            message: prompt,
          },
        ],
        {
          responseFormat: AI_RESPONSE_FORMAT.PLAIN_TEXT,
        },
      );
      if (response.tokensUsed) {
        this._tokensUsed.push(response.tokensUsed);
      }
      try {
        if (!response.data) {
          throw new Error('No response provided by AI');
        }
        const guidelinesInASTMode = this.parseGuidelinesForAst(response.data);

        this._logger.info(
          `[${this._detectionProgramRuleInput.rule.id}] =====  Guidelines in AST Mode have been generated`,
        );
        return this.generateInitialProgram(guidelinesInASTMode);
      } catch (error) {
        this._logger.error(getErrorMessage(error));
      }
      i++;
    }

    throw new Error('Unable to generate program - MAX_RETRY reached');
  }

  private async generateInitialProgram(
    guidelinesInASTMode: string,
  ): Promise<string> {
    const programGenerationPrompt = await this.createPromptToGenerateProgram();

    this._initialPrompt =
      await this.createPromptToGenerateProgramAndRemoveExamples(
        guidelinesInASTMode,
      );

    const program = await this._aiService.executePrompt(
      programGenerationPrompt,
      {
        responseFormat: AI_RESPONSE_FORMAT.PLAIN_TEXT,
      },
    );
    if (program.tokensUsed) {
      this._tokensUsed.push(program.tokensUsed);
    }

    if (!program.data) {
      throw new Error('No data provided by AI');
    }
    return parseCodeOrJsonFromAIAnswer(program.data);
  }

  parseGuidelinesForAst(response: string) {
    const output = parseCodeOrYamlFromAIAnswer(response);
    const yamlObject = YAML.parse(output);
    let i = 1;
    let prompt = '';
    for (const guideline of yamlObject.guidelines) {
      prompt += `## Guideline for scenario ${i}\n`;
      prompt += `${guideline.guideline}\n`;
      i++;
    }
    return prompt.trim();
  }

  // Our input is a practice that contains instructions related to source code.
  // Here we want to work on a AST representation in JSON.
  // So the first prompt that will generate a program should not have any source as input.
  private async convertRuleAndGuidelinesToPromptDedicatedToASTMode(): Promise<string> {
    return this.updatePromptWithRuleInformationAndExamplesInJsonASTMode(
      convert_rule_guidelines_to_ast,
    );
  }

  private async createPromptToGenerateProgram() {
    return this.updatePromptWithRuleInformationAndExamplesInJsonASTMode(
      generate_program_for_ast_json,
    );
  }

  private async updatePromptWithRuleInformationAndExamplesInJsonASTMode(
    prompt: string,
  ) {
    try {
      const promptExternalLibraries = await buildPromptForExternalLibraries(
        this._detectionProgramRuleInput,
        this._linterAstAdapter,
      );
      const formattedHeuristics =
        this._detectionProgramRuleInput.heuristics &&
        this._detectionProgramRuleInput.heuristics.length > 0
          ? this._detectionProgramRuleInput.heuristics
              .map((h) => `* ${h}`)
              .join('\n')
          : '';

      return prompt
        .replace('$RULE_CONTENT$', this._detectionProgramRuleInput.rule.content)
        .replace('$RULE_HEURISTICS$', formattedHeuristics)
        .replace('$RULE_LANGUAGE$', this._detectionProgramRuleInput.language)
        .replace('$PROGRAM_EXTERNAL_LIBRARIES$', promptExternalLibraries)
        .replace(
          '$RULE_BAD_EXAMPLES$',
          await this.getBadExamplesCodeInJSONMode(
            this._detectionProgramRuleInput.ruleExamples,
            this._detectionProgramRuleInput.language,
          ),
        )
        .replace(
          '$RULE_GOOD_EXAMPLES$',
          await this.getGoodExamplesCodeInJSONMode(
            this._detectionProgramRuleInput.ruleExamples,
            this._detectionProgramRuleInput.language,
          ),
        );
    } catch {
      return prompt;
    }
  }

  private async createPromptToGenerateProgramAndRemoveExamples(
    guidelinesInASTMode: string,
  ): Promise<string> {
    const prompt = generate_program_for_ast_json;
    try {
      const promptExternalLibraries = await buildPromptForExternalLibraries(
        this._detectionProgramRuleInput,
        this._linterAstAdapter,
      );
      return prompt
        .replace('$RULE_CONTENT$', this._detectionProgramRuleInput.rule.content)
        .replace('$RULE_AST_GUIDELINES$', guidelinesInASTMode)
        .replace('$RULE_LANGUAGE$', this._detectionProgramRuleInput.language)
        .replace('$PROGRAM_EXTERNAL_LIBRARIES$', promptExternalLibraries)
        .replace('$RULE_BAD_EXAMPLES$', '') // We don't include source code examples here as they'll be introduced later in AST JSON mode if needed
        .replace('$RULE_GOOD_EXAMPLES$', ''); // Same
    } catch {
      return prompt;
    }
  }

  async getFileInputFromContent(
    fileContent: string,
    language: ProgrammingLanguage,
  ): Promise<SourceCodeRepresentation> {
    const code = await getFullAstFromASourceCode(
      fileContent,
      language,
      this._linterAstAdapter,
    );
    return {
      content: code,
      sourceCodeState: 'AST',
    };
  }

  private async getGoodExamplesCodeInJSONMode(
    ruleExamples: RuleExample[],
    language: ProgrammingLanguage,
  ) {
    const goodExamples = ruleExamples
      .map((example) => example.negative)
      .filter((example) => example?.length);

    if (!goodExamples.length) {
      return '';
    }

    let goodExamplesCode = '## Good code examples for the practice:';
    for (const example of goodExamples) {
      const prompt = `\`\`\`
${await getPartialAstFromASourceCode(example, 0, example.split('\n').length, language, this._linterAstAdapter)}
\`\`\` `;
      goodExamplesCode = `${goodExamplesCode} \n ${prompt}`;
    }
    return goodExamplesCode;
  }

  private async getBadExamplesCodeInJSONMode(
    ruleExamples: RuleExample[],
    language: ProgrammingLanguage,
  ) {
    const badExamples = ruleExamples
      .map((example) => example.negative)
      .filter((example) => example?.length);

    if (!badExamples.length) {
      return '';
    }

    let badExamplesCode = '## Bad code examples for the practice:';

    for (const example of badExamples) {
      const prompt = `\`\`\`
${await getPartialAstFromASourceCode(example, 0, example.split('\n').length, language, this._linterAstAdapter)}
\`\`\`
`;
      badExamplesCode = `${badExamplesCode} \n ${prompt}`;
    }
    return badExamplesCode;
  }

  async getSuffixCode(): Promise<string> {
    return getFileContent(`${Globals.JS_PLAYGROUND_PATH}/suffix_ast.js`);
  }

  async getSuffixCodeForMultiplePrograms(): Promise<string> {
    return getFileContent(`${Globals.JS_PLAYGROUND_PATH}/suffix_ast_multi.js`);
  }

  getSourceCodeState(): SourceCodeState {
    return 'AST';
  }
}
