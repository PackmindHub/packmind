import { PackmindLogger } from '@packmind/logger';
import {
  AIService,
  OpenAIService,
  AiNotConfigured,
} from '@packmind/node-utils';
import {
  IStandardsPort,
  IRecipesPort,
  Topic,
  OrganizationId,
  SpaceId,
  KnowledgePatchType,
  RecipeId,
  StandardId,
  RuleId,
  createRuleId,
} from '@packmind/types';
import { CreateKnowledgePatchData } from './KnowledgePatchService';
import { filterStandardCandidatesPrompt } from './prompts/filterStandardCandidates.prompt';
import { filterRecipeCandidatesPrompt } from './prompts/filterRecipeCandidates.prompt';
import { determineNewArtifactPrompt } from './prompts/determineNewArtifact.prompt';
import { classifyChangeTypePrompt } from './prompts/classifyChangeType.prompt';
import { analyzeRecipeEditPrompt } from './prompts/analyzeRecipeEdit.prompt';
import { classifyStandardRulesPrompt } from './prompts/classifyStandardRules.prompt';
import { updateRulePrompt } from './prompts/updateRule.prompt';
import { analyzeStandardDescriptionPrompt } from './prompts/analyzeStandardDescription.prompt';

const origin = 'DistillationService';

type ChangeClassification =
  | 'edit_standard'
  | 'edit_recipe'
  | 'create_standard'
  | 'create_recipe'
  | 'no_change';

type ClassificationResult = {
  classification: ChangeClassification;
  reasoning: string;
};

type RuleUpdate = {
  ruleId: string;
  newContent: string;
};

type NewRule = {
  content: string;
};

type RuleClassificationResult = {
  ruleClassifications: Array<{
    ruleId: string;
    action: 'keep' | 'update' | 'delete';
    reasoning: string;
  }>;
  newRules: Array<{
    content: string;
    reasoning: string;
  }>;
};

type RuleUpdateResult = {
  updatedContent: string;
  changes: string;
};

type DescriptionAnalysisResult = {
  shouldUpdate: boolean;
  newDescription: string | null;
  reasoning: string;
};

type StandardEditResult = {
  description?: string | null;
  rules: {
    toKeep: string[]; // Array of ruleIds
    toUpdate: RuleUpdate[];
    toDelete: string[]; // Array of ruleIds
    toAdd: NewRule[];
  };
  rationale: string;
};

type RecipeEditResult = {
  changes: {
    name?: string | null;
    content?: string | null;
    exampleChanges?: {
      toAdd?: Array<{ lang: string; code: string; description: string }> | null;
      toUpdate?: Array<{
        exampleId: string;
        lang: string;
        code: string;
        description: string;
      }> | null;
      toDelete?: string[] | null;
    } | null;
  };
  rationale: string;
};

type NewArtifactResult = {
  createStandard: boolean;
  createRecipe: boolean;
  standardProposal: {
    name: string;
    description: string;
    rules: string[];
    scope: string;
  } | null;
  recipeProposal: {
    name: string;
    description: string;
    content: string;
  } | null;
  rationale: string;
};

export class DistillationService {
  private readonly aiService: AIService;

  constructor(
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.aiService = new OpenAIService();
    this.logger.info('DistillationService initialized');
  }

  /**
   * Parse AI response data - handles both string and already-parsed objects
   * OpenAIService auto-parses JSON responses that start with '{'
   */
  private parseAIResponse<T>(data: unknown): T {
    if (typeof data === 'string') {
      return JSON.parse(data.trim()) as T;
    }
    return data as T;
  }

  /**
   * Classify what type of change should be made to an artifact based on the topic
   */
  private async classifyChangeType(
    topic: Topic,
    artifactName: string,
    artifactContent: string,
    artifactType: 'standard' | 'recipe',
  ): Promise<ClassificationResult> {
    this.logger.debug('Classifying change type', {
      artifactName,
      artifactType,
    });

    try {
      const prompt = classifyChangeTypePrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{artifactType}', artifactType)
        .replace('{artifactName}', artifactName)
        .replace('{artifactContent}', artifactContent)
        .replace(/{artifactType}/g, artifactType);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to classify change type', {
          error: result.error,
        });
        return { classification: 'no_change', reasoning: 'AI service error' };
      }

      const classification = this.parseAIResponse<ClassificationResult>(
        result.data,
      );
      this.logger.debug('Classification result', {
        classification: classification.classification,
        reasoning: classification.reasoning,
      });

      return classification;
    } catch (error) {
      this.logger.error('Failed to classify change type', {
        artifactName,
        error: error instanceof Error ? error.message : String(error),
      });
      return { classification: 'no_change', reasoning: 'Classification error' };
    }
  }

  /**
   * Analyze a standard to determine what edits should be made based on the topic
   * Uses new rule-centric flow: classify rules -> update specific rules -> analyze description
   */
  private async analyzeStandardEdit(
    topic: Topic,
    standardId: StandardId,
  ): Promise<CreateKnowledgePatchData | null> {
    this.logger.debug('Analyzing standard for edits', { standardId });

    try {
      const standard = await this.standardsPort.getStandard(standardId);
      if (!standard) {
        this.logger.warn('Standard not found', { standardId });
        return null;
      }

      const rules = await this.standardsPort.getLatestRulesByStandardId(
        standard.id,
      );

      const codeExamplesText =
        topic.codeExamples.length > 0
          ? topic.codeExamples
              .map((ex) => `\`\`\`${ex.language}\n${ex.code}\n\`\`\``)
              .join('\n\n')
          : 'No code examples provided';

      // Step 1: Classify all rules (keep/update/delete) and identify new rules
      const ruleClassifications = await this.classifyStandardRules(
        topic,
        standard,
        rules,
        codeExamplesText,
      );

      if (!ruleClassifications) {
        this.logger.warn('Failed to classify rules', { standardId });
        return null;
      }

      // Step 2: For each rule marked 'update', generate the updated content
      const rulesToUpdate: RuleUpdate[] = [];
      for (const classification of ruleClassifications.ruleClassifications) {
        if (classification.action === 'update') {
          const rule = rules.find((r) => r.id === classification.ruleId);
          if (rule) {
            const updatedRule = await this.updateRule(
              topic,
              standard,
              rule,
              codeExamplesText,
            );
            if (updatedRule) {
              rulesToUpdate.push({
                ruleId: rule.id,
                newContent: updatedRule.updatedContent,
              });
            }
          }
        }
      }

      // Step 3: Determine description changes
      const descriptionAnalysis = await this.analyzeStandardDescription(
        topic,
        standard,
        rules,
        ruleClassifications,
        rulesToUpdate,
      );

      // Build the StandardEditResult
      const toKeep = ruleClassifications.ruleClassifications
        .filter((c) => c.action === 'keep')
        .map((c) => c.ruleId);

      const toDelete = ruleClassifications.ruleClassifications
        .filter((c) => c.action === 'delete')
        .map((c) => c.ruleId);

      const toAdd = ruleClassifications.newRules.map((r) => ({
        content: r.content,
      }));

      const analysis: StandardEditResult = {
        description: descriptionAnalysis?.shouldUpdate
          ? descriptionAnalysis.newDescription
          : null,
        rules: {
          toKeep,
          toUpdate: rulesToUpdate,
          toDelete,
          toAdd,
        },
        rationale: `Based on topic "${topic.title}": ${ruleClassifications.ruleClassifications.length} rules classified, ${rulesToUpdate.length} rules updated, ${toDelete.length} rules deleted, ${toAdd.length} new rules added.`,
      };

      // Build diff representation
      const buildStandardDoc = (
        name: string,
        description: string,
        rulesList: Array<{ id: RuleId; content: string }>,
      ) => {
        return `# ${name}\n\n${description}\n\n## Rules\n\n${rulesList.map((r) => `- ${r.content}`).join('\n')}`;
      };

      const originalRules = rules.map((r) => ({
        id: r.id,
        content: r.content,
      }));

      let modifiedRules = [...originalRules];

      // Apply rule updates
      for (const update of rulesToUpdate) {
        const idx = modifiedRules.findIndex((r) => r.id === update.ruleId);
        if (idx !== -1) {
          modifiedRules[idx] = {
            id: createRuleId(update.ruleId),
            content: update.newContent,
          };
        }
      }

      // Apply rule deletions
      modifiedRules = modifiedRules.filter(
        (r) => !toDelete.includes(r.id as string),
      );

      // Apply rule additions
      modifiedRules.push(
        ...toAdd.map((newRule, idx) => ({
          id: createRuleId(`new-${idx}`),
          content: newRule.content,
        })),
      );

      const diffOriginal = buildStandardDoc(
        standard.name,
        standard.description,
        originalRules,
      );
      const diffModified = buildStandardDoc(
        standard.name,
        analysis.description || standard.description,
        modifiedRules,
      );

      return {
        spaceId: topic.spaceId,
        patchType: KnowledgePatchType.UPDATE_STANDARD,
        proposedChanges: {
          standardId: standard.id,
          ...analysis,
        },
        diffOriginal,
        diffModified,
      };
    } catch (error) {
      this.logger.error('Failed to analyze standard edit', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Classify rules within a standard (keep/update/delete) and identify new rules to add
   */
  private async classifyStandardRules(
    topic: Topic,
    standard: { name: string; description: string },
    rules: Array<{ id: RuleId; content: string }>,
    codeExamplesText: string,
  ): Promise<RuleClassificationResult | null> {
    this.logger.debug('Classifying standard rules', {
      standardName: standard.name,
      ruleCount: rules.length,
    });

    try {
      const rulesText =
        rules.length > 0
          ? rules.map((r) => `[${r.id}] ${r.content}`).join('\n')
          : 'No rules defined yet';

      const prompt = classifyStandardRulesPrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{codeExamples}', codeExamplesText)
        .replace('{standardName}', standard.name)
        .replace('{standardDescription}', standard.description)
        .replace('{rules}', rulesText);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to classify rules', {
          error: result.error,
        });
        return null;
      }

      return this.parseAIResponse<RuleClassificationResult>(result.data);
    } catch (error) {
      this.logger.error('Failed to classify standard rules', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Update a specific rule based on the topic
   */
  private async updateRule(
    topic: Topic,
    standard: { name: string; description: string },
    rule: { id: RuleId; content: string },
    codeExamplesText: string,
  ): Promise<RuleUpdateResult | null> {
    this.logger.debug('Updating rule', { ruleId: rule.id });

    try {
      const prompt = updateRulePrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{codeExamples}', codeExamplesText)
        .replace('{standardName}', standard.name)
        .replace('{standardDescription}', standard.description)
        .replace('{ruleId}', rule.id)
        .replace('{ruleContent}', rule.content);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to update rule', {
          error: result.error,
          ruleId: rule.id,
        });
        return null;
      }

      return this.parseAIResponse<RuleUpdateResult>(result.data);
    } catch (error) {
      this.logger.error('Failed to update rule', {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Analyze whether the standard's description needs to be updated
   */
  private async analyzeStandardDescription(
    topic: Topic,
    standard: { name: string; description: string },
    currentRules: Array<{ id: RuleId; content: string }>,
    ruleClassifications: RuleClassificationResult,
    rulesToUpdate: RuleUpdate[],
  ): Promise<DescriptionAnalysisResult | null> {
    this.logger.debug('Analyzing standard description', {
      standardName: standard.name,
    });

    try {
      const currentRulesText = currentRules
        .map((r) => `- ${r.content}`)
        .join('\n');

      const rulesToAddText =
        ruleClassifications.newRules.length > 0
          ? ruleClassifications.newRules.map((r) => `- ${r.content}`).join('\n')
          : 'None';

      const rulesToUpdateText =
        rulesToUpdate.length > 0
          ? rulesToUpdate
              .map((u) => {
                const originalRule = currentRules.find(
                  (r) => r.id === u.ruleId,
                );
                return `- [${u.ruleId}] "${originalRule?.content}" → "${u.newContent}"`;
              })
              .join('\n')
          : 'None';

      const rulesToDeleteText =
        ruleClassifications.ruleClassifications.filter(
          (c) => c.action === 'delete',
        ).length > 0
          ? ruleClassifications.ruleClassifications
              .filter((c) => c.action === 'delete')
              .map((c) => {
                const rule = currentRules.find((r) => r.id === c.ruleId);
                return `- [${c.ruleId}] ${rule?.content}`;
              })
              .join('\n')
          : 'None';

      const prompt = analyzeStandardDescriptionPrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{standardName}', standard.name)
        .replace('{currentDescription}', standard.description)
        .replace('{currentRules}', currentRulesText)
        .replace('{rulesToAdd}', rulesToAddText)
        .replace('{rulesToUpdate}', rulesToUpdateText)
        .replace('{rulesToDelete}', rulesToDeleteText);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to analyze description', {
          error: result.error,
        });
        return null;
      }

      return this.parseAIResponse<DescriptionAnalysisResult>(result.data);
    } catch (error) {
      this.logger.error('Failed to analyze standard description', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Analyze a recipe to determine what edits should be made based on the topic
   */
  private async analyzeRecipeEdit(
    topic: Topic,
    recipeId: RecipeId,
  ): Promise<CreateKnowledgePatchData | null> {
    this.logger.debug('Analyzing recipe for edits', { recipeId });

    try {
      const recipe = await this.recipesPort.getRecipeByIdInternal(recipeId);
      if (!recipe) {
        this.logger.warn('Recipe not found', { recipeId });
        return null;
      }

      const codeExamplesText =
        topic.codeExamples.length > 0
          ? topic.codeExamples
              .map((ex) => `\`\`\`${ex.language}\n${ex.code}\n\`\`\``)
              .join('\n\n')
          : 'No code examples provided';

      const prompt = analyzeRecipeEditPrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{codeExamples}', codeExamplesText)
        .replace('{recipeName}', recipe.name)
        .replace('{recipeContent}', recipe.content);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to analyze recipe edit', {
          error: result.error,
        });
        return null;
      }

      const analysis = this.parseAIResponse<RecipeEditResult>(result.data);

      const diffOriginal = `# ${recipe.name}\n\n${recipe.content}`;
      const diffModified = `# ${analysis.changes.name || recipe.name}\n\n${analysis.changes.content || recipe.content}`;

      return {
        spaceId: topic.spaceId,
        patchType: KnowledgePatchType.UPDATE_RECIPE,
        proposedChanges: {
          recipeId: recipe.id,
          changes: analysis.changes,
          rationale: analysis.rationale,
        },
        diffOriginal,
        diffModified,
      };
    } catch (error) {
      this.logger.error('Failed to analyze recipe edit', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async distillTopic(
    topic: Topic,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<CreateKnowledgePatchData[]> {
    this.logger.info('Starting topic distillation', {
      topicTitle: topic.title,
    });

    const isConfigured = await this.aiService.isConfigured();
    if (!isConfigured) {
      this.logger.warn('AI service not configured - cannot distill topic', {});
      throw new AiNotConfigured(
        'AI service not configured for topic distillation',
      );
    }

    try {
      const patches: CreateKnowledgePatchData[] = [];

      // Step 1: Filter candidate standards
      const candidateStandardIds = await this.filterCandidateStandards(
        topic,
        topic.spaceId,
        organizationId,
        userId,
      );
      this.logger.info('Filtered candidate standards', {
        count: candidateStandardIds.length,
        standardIds: candidateStandardIds,
      });

      // Step 2: Classify and analyze each candidate standard
      for (const standardId of candidateStandardIds) {
        const standard = await this.standardsPort.getStandard(
          standardId as StandardId,
        );
        if (!standard) continue;

        const classification = await this.classifyChangeType(
          topic,
          standard.name,
          standard.description,
          'standard',
        );

        if (classification.classification === 'edit_standard') {
          const patch = await this.analyzeStandardEdit(topic, standard.id);
          if (patch) {
            patches.push(patch);
          }
        }
      }

      // Step 3: Filter candidate recipes
      const candidateRecipeIds = await this.filterCandidateRecipes(
        topic,
        organizationId,
      );
      this.logger.info('Filtered candidate recipes', {
        count: candidateRecipeIds.length,
        recipeIds: candidateRecipeIds,
      });

      // Step 4: Classify and analyze each candidate recipe
      for (const recipeId of candidateRecipeIds) {
        const recipe = await this.recipesPort.getRecipeByIdInternal(
          recipeId as RecipeId,
        );
        if (!recipe) continue;

        const classification = await this.classifyChangeType(
          topic,
          recipe.name,
          recipe.content.substring(0, 500),
          'recipe',
        );

        if (classification.classification === 'edit_recipe') {
          const patch = await this.analyzeRecipeEdit(topic, recipe.id);
          if (patch) {
            patches.push(patch);
          }
        }
      }

      // Step 5: If no edit patches found, determine if new artifacts needed
      if (patches.length === 0) {
        this.logger.info(
          'No existing artifacts matched - checking if new artifact needed',
          { topicId: topic.id },
        );
        const newPatches = await this.determineNewArtifacts(topic);
        patches.push(...newPatches);
      }

      this.logger.info('Topic distillation completed', {
        patchesGenerated: patches.length,
      });

      return patches;
    } catch (error) {
      this.logger.error('Failed to distill topic', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async filterCandidateStandards(
    topic: Topic,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<string[]> {
    this.logger.debug('Filtering candidate standards', { topicId: topic.id });

    try {
      const standards = await this.standardsPort.listStandardsBySpace(
        spaceId,
        organizationId,
        userId,
      );

      if (standards.length === 0) {
        this.logger.debug('No standards found in space');
        return [];
      }

      const standardsList = standards
        .map(
          (s) =>
            `ID: ${s.id}\nName: ${s.name}\nSummary: ${s.description.substring(0, 200)}${s.description.length > 200 ? '...' : ''}`,
        )
        .join('\n---\n');

      const prompt = filterStandardCandidatesPrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{standardsList}', standardsList);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to filter standards', {
          error: result.error,
        });
        return [];
      }

      const candidateIds = this.parseAIResponse<string[]>(result.data);
      return candidateIds;
    } catch (error) {
      this.logger.error('Failed to filter candidate standards', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async filterCandidateRecipes(
    topic: Topic,
    organizationId: OrganizationId,
  ): Promise<string[]> {
    this.logger.debug('Filtering candidate recipes', { topicId: topic.id });

    try {
      const recipes =
        await this.recipesPort.listRecipesByOrganization(organizationId);

      if (recipes.length === 0) {
        this.logger.debug('No recipes found in organization');
        return [];
      }

      const recipesList = recipes
        .map((r) => {
          const contentLines = r.content.split('\n').slice(0, 2).join('\n');
          return `ID: ${r.id}\nName: ${r.name}\nFirst lines: ${contentLines}`;
        })
        .join('\n---\n');

      const prompt = filterRecipeCandidatesPrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{recipesList}', recipesList);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to filter recipes', {
          error: result.error,
        });
        return [];
      }

      const candidateIds = this.parseAIResponse<string[]>(result.data);
      return candidateIds;
    } catch (error) {
      this.logger.error('Failed to filter candidate recipes', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async determineNewArtifacts(
    topic: Topic,
  ): Promise<CreateKnowledgePatchData[]> {
    this.logger.debug('Determining if new artifacts needed', {});

    try {
      const codeExamplesText =
        topic.codeExamples.length > 0
          ? topic.codeExamples
              .map((ex) => `\`\`\`${ex.language}\n${ex.code}\n\`\`\``)
              .join('\n\n')
          : 'No code examples provided';

      const prompt = determineNewArtifactPrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{codeExamples}', codeExamplesText);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to determine new artifacts', {
          error: result.error,
        });
        return [];
      }

      const analysis = this.parseAIResponse<NewArtifactResult>(result.data);
      const patches: CreateKnowledgePatchData[] = [];

      if (analysis.createStandard && analysis.standardProposal) {
        const standardContent = `# ${analysis.standardProposal.name}\n\n${analysis.standardProposal.description}\n\n## Rules\n\n${analysis.standardProposal.rules.map((r) => `- ${r}`).join('\n')}`;
        patches.push({
          spaceId: topic.spaceId,
          patchType: KnowledgePatchType.NEW_STANDARD,
          proposedChanges: {
            name: analysis.standardProposal.name,
            description: analysis.standardProposal.description,
            rules: analysis.standardProposal.rules,
            scope: analysis.standardProposal.scope,
            rationale: analysis.rationale,
          },
          diffOriginal: '',
          diffModified: standardContent,
        });
      }

      if (analysis.createRecipe && analysis.recipeProposal) {
        const recipeContent = `# ${analysis.recipeProposal.name}\n\n${analysis.recipeProposal.description}\n\n${analysis.recipeProposal.content}`;
        patches.push({
          spaceId: topic.spaceId,
          patchType: KnowledgePatchType.NEW_RECIPE,
          proposedChanges: {
            name: analysis.recipeProposal.name,
            description: analysis.recipeProposal.description,
            content: analysis.recipeProposal.content,
            rationale: analysis.rationale,
          },
          diffOriginal: '',
          diffModified: recipeContent,
        });
      }

      this.logger.info('Determined new artifacts', {
        newStandard: analysis.createStandard,
        newRecipe: analysis.createRecipe,
      });

      return patches;
    } catch (error) {
      this.logger.error('Failed to determine new artifacts', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
