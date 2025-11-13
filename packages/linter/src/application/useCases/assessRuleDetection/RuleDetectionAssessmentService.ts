import { parseCodeOrJsonFromAIAnswer } from '../generateProgramUseCase/program/ProgramOutputUtils';
import { generate_rule_assessment } from './prompts/generate_rule_assessment';
import {
  DetectionProgramRuleInput,
  AssessmentDetectionReadiness,
  DetectionHeuristics,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import {
  AI_RESPONSE_FORMAT,
  AIService,
  PromptConversationRole,
} from '@packmind/node-utils';
import AIRequestEmitter from '../../../domain/entities/AIRequestEmitter';
import {
  getBadExamplesCode,
  getGoodExamplesCode,
} from '../generateProgramUseCase/utils/PromptUtils';

const origin = 'RuleDetectionAssessmentService';
export class RuleDetectionAssessmentService extends AIRequestEmitter {
  constructor(
    protected readonly _aiService: AIService,
    protected readonly _logger = new PackmindLogger(origin),
  ) {
    super('assessment-detection-readiness', _aiService, _logger);
  }

  public async runFeasibilityAssessment(
    detectionProgramRuleInput: DetectionProgramRuleInput,
    existingHeuristics: DetectionHeuristics | null = null,
  ): Promise<AssessmentDetectionReadiness> {
    const prompt = this.buildPromptWithRule(
      generate_rule_assessment,
      detectionProgramRuleInput,
      existingHeuristics,
    );
    const MAX_RETRY = 3;
    let i = 0;
    while (i < MAX_RETRY) {
      try {
        const response = await this.callAiProvider(
          [
            {
              role: PromptConversationRole.USER,
              message: prompt,
            },
          ],
          AI_RESPONSE_FORMAT.JSON_MODE,
        );

        if (!response?.data) {
          throw new Error('No data provided by AI');
        }

        // Ensure response.data is a string before parsing
        const responseData =
          typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);

        console.log('responseData', responseData);

        const assessment: AssessmentDetectionReadiness = JSON.parse(
          parseCodeOrJsonFromAIAnswer(responseData),
        );

        this._logger.info(
          `Assessment result: ${JSON.stringify(assessment, null, 2)}`,
        );

        return {
          feasible: assessment.feasible || false,
          reason: assessment.reason || [],
        };
      } catch (error) {
        this._logger.error(
          `[TaskId=${this._taskId}] Error when running feasibility assessment for ruleId=${detectionProgramRuleInput.rule.id} - ${error instanceof Error ? error.message : String(error)}`,
        );
        i++;
      }
    }

    if (i > MAX_RETRY) {
      this._logger.error(
        `[TaskId=${this._taskId}] Max retries reached for generating coding rule assessment for ruleId=${detectionProgramRuleInput.rule.id}`,
      );
      return {
        feasible: false,
        reason: ['Assessment failed due to technical error'],
      };
    }

    // If all retries failed, assume not feasible
    return {
      feasible: false,
      reason: ['Assessment failed due to technical error'],
    };
  }

  private buildPromptWithRule(
    prompt: string,
    rule: DetectionProgramRuleInput,
    existingHeuristics: DetectionHeuristics | null,
  ) {
    const ruleText = this.getRuleText(rule);
    let updatedPrompt = prompt.replace('$CODING_RULE$', ruleText);

    // Inject heuristics section if they exist and are not empty
    if (existingHeuristics && existingHeuristics.heuristics.length > 0) {
      const formattedHeuristics = existingHeuristics.heuristics
        .map((h) => `* ${h}`)
        .join('\n');
      const heuristicsSection = `
## Detection Heuristics (if available)

The following heuristics may help you assess the detectability of similar rules. Use them to inform your evaluation, but do not rely on them exclusively:

"""
${formattedHeuristics}
"""
`;
      updatedPrompt = updatedPrompt.replace(
        /## Detection Heuristics \(if available\)[\s\S]*?\$DETECTION_HEURISTICS\$[\s\S]*?"""\s*/,
        heuristicsSection,
      );
    } else {
      // Remove the entire heuristics section if not available
      updatedPrompt = updatedPrompt.replace(
        /## Detection Heuristics \(if available\)[\s\S]*?\$DETECTION_HEURISTICS\$[\s\S]*?"""\s*/,
        '',
      );
    }

    return updatedPrompt;
  }

  private getRuleText(rule: DetectionProgramRuleInput) {
    return `
Rule name: ${rule.rule.content}
Rule programming language: ${rule.language}
${getGoodExamplesCode(rule.ruleExamples)}
${getBadExamplesCode(rule.ruleExamples)}
`;
  }

  getOperationType(): string {
    return 'RULE_ASSESSMENT_FOR_DETECTION_READINESS';
  }
}
