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
} from '@packmind/types';
import { CreateKnowledgePatchData } from './KnowledgePatchService';
import { filterStandardCandidatesPrompt } from './prompts/filterStandardCandidates.prompt';
import { filterRecipeCandidatesPrompt } from './prompts/filterRecipeCandidates.prompt';
import { analyzeStandardMatchPrompt } from './prompts/analyzeStandardMatch.prompt';
import { analyzeRecipeMatchPrompt } from './prompts/analyzeRecipeMatch.prompt';
import { determineNewArtifactPrompt } from './prompts/determineNewArtifact.prompt';

const origin = 'DistillationService';

type StandardMatchResult = {
  action: 'addRule' | 'updateRule' | 'noMatch';
  targetRuleId: string | null;
  proposedContent: string;
  rationale: string;
};

type RecipeMatchResult = {
  action: 'addSteps' | 'updateSteps' | 'noMatch';
  proposedContent: string;
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

  async distillTopic(
    topic: Topic,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<CreateKnowledgePatchData[]> {
    this.logger.info('Starting topic distillation', {
      topicId: topic.id,
      topicTitle: topic.title,
    });

    const isConfigured = await this.aiService.isConfigured();
    if (!isConfigured) {
      this.logger.warn('AI service not configured - cannot distill topic', {
        topicId: topic.id,
      });
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

      // Step 2: Analyze each candidate standard
      for (const standardId of candidateStandardIds) {
        const patch = await this.analyzeStandardMatch(topic, standardId);
        if (patch) {
          patches.push(patch);
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

      // Step 4: Analyze each candidate recipe
      for (const recipeId of candidateRecipeIds) {
        const patch = await this.analyzeRecipeMatch(topic, recipeId);
        if (patch) {
          patches.push(patch);
        }
      }

      // Step 5: If no matches found, determine if new artifact needed
      if (patches.length === 0) {
        this.logger.info(
          'No existing artifacts matched - checking if new artifact needed',
          { topicId: topic.id },
        );
        const newPatches = await this.determineNewArtifacts(topic);
        patches.push(...newPatches);
      }

      this.logger.info('Topic distillation completed', {
        topicId: topic.id,
        patchesGenerated: patches.length,
      });

      return patches;
    } catch (error) {
      this.logger.error('Failed to distill topic', {
        topicId: topic.id,
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
            `ID: ${s.id}\nName: ${s.name}\nDescription: ${s.description}\nScope: ${s.scope || 'Global'}`,
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
        .map((r) => `ID: ${r.id}\nName: ${r.name}\nSlug: ${r.slug}`)
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

  private async analyzeStandardMatch(
    topic: Topic,
    standardId: string,
  ): Promise<CreateKnowledgePatchData | null> {
    this.logger.debug('Analyzing standard match', {
      topicId: topic.id,
      standardId,
    });

    try {
      const standard = await this.standardsPort.getStandard(
        standardId as StandardId,
      );
      if (!standard) {
        this.logger.warn('Standard not found', { standardId });
        return null;
      }

      const rules = await this.standardsPort.getLatestRulesByStandardId(
        standard.id,
      );
      const rulesText =
        rules.length > 0
          ? rules.map((r) => `- ${r.content}`).join('\n')
          : 'No rules defined yet';

      const codeExamplesText =
        topic.codeExamples.length > 0
          ? topic.codeExamples
              .map((ex) => `\`\`\`${ex.language}\n${ex.code}\n\`\`\``)
              .join('\n\n')
          : 'No code examples provided';

      const prompt = analyzeStandardMatchPrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{codeExamples}', codeExamplesText)
        .replace('{standardName}', standard.name)
        .replace('{standardDescription}', standard.description)
        .replace('{standardRules}', rulesText);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to analyze standard match', {
          error: result.error,
        });
        return null;
      }

      const analysis = this.parseAIResponse<StandardMatchResult>(result.data);

      if (analysis.action === 'noMatch') {
        this.logger.debug('No match for standard', { standardId });
        return null;
      }

      // Build full standard document for diff view
      const buildStandardDoc = (
        rulesList: Array<{ id: string; content: string }>,
        modifiedRuleId?: string,
        modifiedContent?: string,
        isAddRule?: boolean,
      ) => {
        let docRules = [...rulesList];

        if (isAddRule && modifiedContent) {
          // Add new rule at the end
          docRules.push({ id: 'new', content: modifiedContent });
        } else if (modifiedRuleId && modifiedContent) {
          // Replace existing rule
          docRules = docRules.map((r) =>
            r.id === modifiedRuleId ? { ...r, content: modifiedContent } : r,
          );
        }

        return `# ${standard.name}\n\n${standard.description}\n\n## Rules\n\n${docRules.map((r) => `- ${r.content}`).join('\n')}`;
      };

      const diffOriginal = buildStandardDoc(
        rules.map((r) => ({ id: r.id, content: r.content })),
      );
      const diffModified =
        analysis.action === 'addRule'
          ? buildStandardDoc(
              rules.map((r) => ({ id: r.id, content: r.content })),
              undefined,
              analysis.proposedContent,
              true,
            )
          : buildStandardDoc(
              rules.map((r) => ({ id: r.id, content: r.content })),
              analysis.targetRuleId || '',
              analysis.proposedContent,
            );

      const patchType =
        analysis.action === 'addRule'
          ? KnowledgePatchType.UPDATE_STANDARD
          : KnowledgePatchType.UPDATE_STANDARD;

      return {
        spaceId: topic.spaceId,
        topicId: topic.id,
        patchType,
        proposedChanges: {
          standardId: standard.id,
          action: analysis.action,
          targetRuleId: analysis.targetRuleId,
          content: analysis.proposedContent,
          rationale: analysis.rationale,
        },
        diffOriginal,
        diffModified,
      };
    } catch (error) {
      this.logger.error('Failed to analyze standard match', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async analyzeRecipeMatch(
    topic: Topic,
    recipeId: string,
  ): Promise<CreateKnowledgePatchData | null> {
    this.logger.debug('Analyzing recipe match', {
      topicId: topic.id,
      recipeId,
    });

    try {
      const recipe = await this.recipesPort.getRecipeByIdInternal(
        recipeId as RecipeId,
      );
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

      const prompt = analyzeRecipeMatchPrompt
        .replace('{topicTitle}', topic.title)
        .replace('{topicContent}', topic.content)
        .replace('{codeExamples}', codeExamplesText)
        .replace('{recipeName}', recipe.name)
        .replace('{recipeContent}', recipe.content);

      const result = await this.aiService.executePrompt<string>(prompt);

      if (!result.success || !result.data) {
        this.logger.warn('AI service failed to analyze recipe match', {
          error: result.error,
        });
        return null;
      }

      const analysis = this.parseAIResponse<RecipeMatchResult>(result.data);

      if (analysis.action === 'noMatch') {
        this.logger.debug('No match for recipe', { recipeId });
        return null;
      }

      // Build full recipe document for diff view
      const diffOriginal = `# ${recipe.name}\n\n${recipe.content}`;
      const diffModified = `# ${recipe.name}\n\n${analysis.proposedContent}`;

      return {
        spaceId: topic.spaceId,
        topicId: topic.id,
        patchType: KnowledgePatchType.UPDATE_RECIPE,
        proposedChanges: {
          recipeId: recipe.id,
          action: analysis.action,
          content: analysis.proposedContent,
          rationale: analysis.rationale,
        },
        diffOriginal,
        diffModified,
      };
    } catch (error) {
      this.logger.error('Failed to analyze recipe match', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async determineNewArtifacts(
    topic: Topic,
  ): Promise<CreateKnowledgePatchData[]> {
    this.logger.debug('Determining if new artifacts needed', {
      topicId: topic.id,
    });

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
          topicId: topic.id,
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
          topicId: topic.id,
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
        topicId: topic.id,
        newStandard: analysis.createStandard,
        newRecipe: analysis.createRecipe,
      });

      return patches;
    } catch (error) {
      this.logger.error('Failed to determine new artifacts', {
        topicId: topic.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
