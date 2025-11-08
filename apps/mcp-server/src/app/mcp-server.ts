import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  IAnalyticsPort,
  getAllProgrammingLanguages,
  ProgrammingLanguage,
  Space,
  stringToProgrammingLanguage,
  RuleWithExamples,
  RecipeStep,
} from '@packmind/types';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { AnalyticsAdapter } from '@packmind/amplitude';

import packmindOnboardingModeSelection from './prompts/packmind-onboarding-mode-selection';
import packmindOnboardingCodebaseAnalysis from './prompts/packmind-onboarding-codebase-analysis';
import packmindOnboardingGitHistory from './prompts/packmind-onboarding-git-history';
import packmindOnboardingDocumentation from './prompts/packmind-onboarding-documentation';
import packmindOnboardingAiInstructions from './prompts/packmind-onboarding-ai-instructions';
import packmindOnboardingWebResearch from './prompts/packmind-onboarding-web-research';
import {
  STANDARD_WORKFLOW_STEP_ORDER,
  STANDARD_WORKFLOW_STEPS,
  StandardWorkflowStep,
} from './prompts/packmind-standard-workflow';
import {
  RECIPE_WORKFLOW_STEP_ORDER,
  RECIPE_WORKFLOW_STEPS,
  RecipeWorkflowStep,
} from './prompts/packmind-recipe-workflow';
import {
  ADD_RULE_WORKFLOW_STEP_ORDER,
  ADD_RULE_WORKFLOW_STEPS,
  AddRuleWorkflowStep,
} from './prompts/packmind-add-rule-workflow';
import { extractCodeFromMarkdown } from '@packmind/node-utils';

interface UserContext {
  email: string;
  userId: string;
  organizationId: string;
  role: string;
}

const mcpToolPrefix = 'packmind';

// Onboarding prompt content imported as strings
const ONBOARDING_PROMPTS = {
  'mode-selection': packmindOnboardingModeSelection,
  'codebase-analysis': packmindOnboardingCodebaseAnalysis,
  'git-history': packmindOnboardingGitHistory,
  documentation: packmindOnboardingDocumentation,
  'ai-instructions': packmindOnboardingAiInstructions,
  'web-research': packmindOnboardingWebResearch,
};

const isStandardWorkflowStep = (value: string): value is StandardWorkflowStep =>
  Object.prototype.hasOwnProperty.call(STANDARD_WORKFLOW_STEPS, value);

const isRecipeWorkflowStep = (value: string): value is RecipeWorkflowStep =>
  Object.prototype.hasOwnProperty.call(RECIPE_WORKFLOW_STEPS, value);

const isAddRuleWorkflowStep = (value: string): value is AddRuleWorkflowStep =>
  Object.prototype.hasOwnProperty.call(ADD_RULE_WORKFLOW_STEPS, value);

// Temporary: for now, we just deduce the space to use based on the organization
async function getGlobalSpace(
  fastify: FastifyInstance,
  organizationId: OrganizationId,
): Promise<Space> {
  const spacesHexa = fastify.spacesHexa();
  if (!spacesHexa) {
    throw new Error('SpacesHexa not available');
  }

  const spaces = await spacesHexa
    .getAdapter()
    .listSpacesByOrganization(organizationId);

  if (!spaces || spaces.length === 0) {
    throw new Error(
      'No spaces found in organization. Please create a space first before.',
    );
  }

  return spaces[0];
}

export function createMCPServer(
  fastify: FastifyInstance,
  userContext?: UserContext,
) {
  const logger = new PackmindLogger('MCPServer', LogLevel.INFO);

  // Create server instance
  const mcpServer = new McpServer({
    name: 'packmind',
    version: '1.0.0',
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  logger.info('Create MCP server', {
    user: userContext ? userContext.userId : 'anonymous',
  });

  // Initialize analytics adapter
  const analyticsAdapter: IAnalyticsPort = new AnalyticsAdapter(logger);

  // Debug logging for fastify decorators
  logger.debug('Checking fastify decorators:', {
    hasHexaRegistry: typeof fastify.hexaRegistry,
    hasAccountsHexa: typeof fastify.accountsHexa,
    hasGitHexa: typeof fastify.gitHexa,
    hasRecipesHexa: typeof fastify.recipesHexa,
    hasAnalyticsHexa: typeof fastify.analyticsHexa,
    hasStandardsHexa: typeof fastify.standardsHexa,
    fastifyKeys: Object.keys(fastify).filter((key) => key.includes('Hexa')),
  });

  // Get the RecipesHexa and StandardsHexa from the HexaRegistry
  logger.debug('Attempting to call fastify.recipesHexa()');
  const recipesHexa = fastify.recipesHexa();
  logger.debug('Attempting to call fastify.standardsHexa()');
  const standardsHexa = fastify.standardsHexa();
  logger.debug('Attempting to call fastify.deploymentsHexa()');
  const deploymentsHexa = fastify.deploymentsHexa();
  const accountsHexa =
    typeof fastify.accountsHexa === 'function'
      ? fastify.accountsHexa()
      : undefined;

  if (accountsHexa) {
    deploymentsHexa.setAccountProviders(
      accountsHexa.getUserProvider(),
      accountsHexa.getOrganizationProvider(),
    );
  }
  logger.debug('Attempting to call fastify.analyticsHexa()');
  const analyticsHexa = fastify.analyticsHexa();

  // Set up deployment port injection for analytics
  logger.debug('Setting up deployment port injection for analytics');
  const deploymentPort = deploymentsHexa.getAdapter();
  analyticsHexa.setDeploymentPort(deploymentPort);
  logger.debug('Deployment port injection completed');

  mcpServer.tool(
    `${mcpToolPrefix}_say_hello`,
    'Just answer "Hello" to the user if he asks you to say hello',
    {
      message: z.string().min(1).describe('The message to say to the user'),
    },
    async ({ message }, extra) => {
      try {
        logger.info(
          `Say hello called with requestInfo: ${JSON.stringify(extra.requestInfo)}`,
        );
      } catch (err) {
        logger.error(err);
      }

      const greeting = userContext ? `Hello ${userContext.email}` : 'Hello you';

      return {
        content: [
          {
            type: 'text',
            text: `${greeting}. I'm a MCP server. Your message is: ${message}`,
          },
        ],
      };
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_create_recipe`,
    'Create a new reusable recipe as a structured Packmind recipe. Do not call this tool directly—you need to first use the tool recipe_creation_workflow',
    {
      name: z.string().min(1).describe('The name of the recipe to create'),
      summary: z
        .string()
        .min(1)
        .describe(
          'A concise sentence describing the intent of this recipe (what it does) and its value (why it is useful) and when it is relevant to use it',
        ),
      whenToUse: z
        .array(z.string())
        .describe(
          'Array of scenarios when this recipe is applicable. Provide specific, actionable scenarios.',
        ),
      contextValidationCheckpoints: z
        .array(z.string())
        .describe(
          'Array of checkpoints to ensure the context is clarified enough before implementing the recipe steps. Each checkpoint should be a question or validation point.',
        ),
      steps: z
        .array(
          z.object({
            name: z
              .string()
              .min(1)
              .describe(
                'The name/title of the step (e.g., "Setup Dependencies")',
              ),
            description: z
              .string()
              .min(1)
              .describe(
                'A sentence describing the intent of the step and how to implement it [Markdown formatted]',
              ),
            codeSnippet: z
              .string()
              .optional()
              .describe(
                'Optional concise and minimal code snippet demonstrating the step. Keep it brief and focused. [Markdown formatted with ``` including the language]',
              ),
          }),
        )
        .describe(
          'Array of atomic steps that make up the recipe implementation. Each step should be clear and actionable.',
        ),
    },
    async ({
      name,
      summary,
      whenToUse,
      contextValidationCheckpoints,
      steps,
    }) => {
      if (!userContext) {
        throw new Error('User context is required to create recipes');
      }

      const globalSpace = await getGlobalSpace(
        fastify,
        createOrganizationId(userContext.organizationId),
      );
      logger.info('Using global space for recipe creation', {
        spaceId: globalSpace.id,
        spaceName: globalSpace.name,
        organizationId: userContext.organizationId,
      });

      const recipe = await recipesHexa.captureRecipe({
        name,
        summary,
        whenToUse,
        contextValidationCheckpoints,
        steps: steps as RecipeStep[],
        organizationId: createOrganizationId(userContext.organizationId),
        userId: createUserId(userContext.userId),
        spaceId: globalSpace.id,
      });

      // Track analytics event
      analyticsAdapter.trackEvent(
        createUserId(userContext.userId),
        createOrganizationId(userContext.organizationId),
        'mcp_tool_call',
        { tool: `${mcpToolPrefix}_create_recipe` },
      );

      return {
        content: [
          {
            type: 'text',
            text: `Recipe '${recipe.name}' has been created successfully.`,
          },
        ],
      };
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_notify_recipe_usage`,
    'Notify a reusable coding recipe deployed with Packmind has been used by an AI Agent such as GitHub Copilot, Claude Code or Cursor.',
    {
      recipesSlug: z
        .array(z.string())
        .min(1)
        .describe('The slugs of the recipes that were used'),
      aiAgent: z
        .string()
        .describe(
          'The name of the AI Agent that used the recipes (ex: Cursor, Claude Code, GitHub Copilot)',
        ),
      gitRepo: z
        .string()
        .optional()
        .describe(
          'The git repository in "owner/repo" format where the recipes were used',
        ),
      target: z
        .string()
        .optional()
        .describe(
          'The path where the recipes are distributed (ex: /, /src/frontend/, /src/backend/)',
        ),
    },
    async ({ recipesSlug, aiAgent, gitRepo, target }) => {
      if (!userContext) {
        throw new Error('User context is required to track recipe usage');
      }

      try {
        const usageRecords = await analyticsHexa.trackRecipeUsage({
          recipeSlugs: recipesSlug,
          aiAgent,
          userId: userContext.userId,
          organizationId: userContext.organizationId,
          gitRepo,
          target,
        });

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `${mcpToolPrefix}_notify_recipe_usage` },
        );

        return {
          content: [
            {
              type: 'text',
              text: `Recipe usage tracked successfully. Created ${usageRecords.length} usage records for AI agent: ${aiAgent}${gitRepo ? ` in repository: ${gitRepo}` : ''}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to track recipe usage: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_add_rule_to_standard`,
    'Add a new coding rule to an existing standard identified by its slug. Do not call this tool directly—you need to first use the tool add_rule_to_standard_workflow',
    {
      standardSlug: z
        .string()
        .min(1)
        .describe('The slug of the standard to add the rule to'),
      ruleContent: z
        .string()
        .min(1)
        .describe(
          'A descriptive name for the coding rule that explains its intention and how it should be used. It must start with a verb to give the intention.',
        ),
      positiveExample: z
        .string()
        .optional()
        .describe(
          'A code snippet that is a valid example of the rule, if applicable. Make sure to use the appropriate language. Code snippet can be multi-line if relevant.',
        ),
      negativeExample: z
        .string()
        .optional()
        .describe(
          'A code snippet that is an invalid example of the rule, if applicable. Make sure to use the appropriate language. Code snippet can be multi-line if relevant.',
        ),
      language: z
        .string()
        .optional()
        .describe(
          `The programming language of the code snippet, if applicable. Pick from ${getAllProgrammingLanguages()}`,
        ),
    },
    async ({
      standardSlug,
      ruleContent,
      positiveExample,
      negativeExample,
      language,
    }) => {
      if (!userContext) {
        throw new Error('User context is required to add rules to standards');
      }

      try {
        const newStandardVersion = await standardsHexa.addRuleToStandard({
          standardSlug: standardSlug.toLowerCase(),
          ruleContent,
          organizationId: createOrganizationId(userContext.organizationId),
          userId: createUserId(userContext.userId),
        });

        const rules = await standardsHexa.getRulesByStandardId(
          newStandardVersion.standardId,
        );
        const newRule = rules.filter((rule) => rule.content === ruleContent);

        const codeSnippetProvided =
          positiveExample?.length > 0 || negativeExample?.length > 0;
        if (newRule && codeSnippetProvided) {
          logger.info('Creating rule example');
          await standardsHexa.createRuleExample({
            ruleId: newRule[0].id,
            positive: extractCodeFromMarkdown(positiveExample) || '',
            negative: extractCodeFromMarkdown(negativeExample) || '',
            lang:
              stringToProgrammingLanguage(language) ||
              ProgrammingLanguage.JAVASCRIPT,
            organizationId: createOrganizationId(userContext.organizationId),
            userId: createUserId(userContext.userId),
          });
        }

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `${mcpToolPrefix}_add_rule_to_standard` },
        );

        return {
          content: [
            {
              type: 'text',
              text: `Rule added successfully to standard '${standardSlug.toLowerCase()}'. New version ${newStandardVersion.version} created.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to add rule to standard: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_list_standards`,
    'Get a list of current standards in Packmind',
    {},
    async () => {
      if (!userContext) {
        throw new Error('User context is required to list standards');
      }

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const globalSpace = await getGlobalSpace(fastify, organizationId);

        const { standards } = await standardsHexa.listStandardsBySpace({
          organizationId,
          spaceId: globalSpace.id,
          userId: createUserId(userContext.userId),
        });

        if (standards.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No standards found for your organization',
              },
            ],
          };
        }

        // Sort alphabetically by slug and limit to 20 standards
        const sortedStandards = standards
          .sort((a, b) => a.slug.localeCompare(b.slug))
          .slice(0, 20);

        // Format as bullet points: • slug: name
        const formattedList = sortedStandards
          .map((standard) => `• ${standard.slug}: ${standard.name}`)
          .join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `${mcpToolPrefix}_list_standards` },
        );

        return {
          content: [
            {
              type: 'text',
              text: formattedList,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list standards: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_get_standard_by_slug`,
    'Get the full content of a standard including its rules and examples by its slug',
    {
      slug: z.string().min(1).describe('The slug of the standard to retrieve'),
    },
    async ({ slug }) => {
      if (!userContext) {
        throw new Error('User context is required to get standard by slug');
      }

      try {
        const organizationId = createOrganizationId(userContext.organizationId);

        const standard = await standardsHexa.findStandardBySlug(
          slug,
          organizationId,
        );

        if (!standard) {
          return {
            content: [
              {
                type: 'text',
                text: `Standard with slug '${slug}' not found in your organization`,
              },
            ],
          };
        }

        // Get rules for this standard
        const rules = await standardsHexa.getRulesByStandardId(standard.id);

        // Build formatted content
        const contentParts = [
          `# ${standard.name}`,
          ``,
          `**Slug:** ${standard.slug}`,
          `**Version:** ${standard.version}`,
          ``,
          `## Description`,
          ``,
          standard.description,
          ``,
        ];

        if (rules.length > 0) {
          contentParts.push(`## Rules`, ``);

          for (const rule of rules) {
            contentParts.push(`### Rule: ${rule.content}`, ``);

            // Get examples for this rule
            const examples = await standardsHexa.getRuleExamples({
              ruleId: rule.id,
              userId: createUserId(userContext.userId),
              organizationId,
            });

            if (examples.length > 0) {
              for (const example of examples) {
                contentParts.push(
                  `**Positive Example (${example.lang}):**`,
                  `\`\`\`${example.lang.toLowerCase()}`,
                  example.positive,
                  `\`\`\``,
                  ``,
                  `**Negative Example (${example.lang}):**`,
                  `\`\`\`${example.lang.toLowerCase()}`,
                  example.negative,
                  `\`\`\``,
                  ``,
                );
              }
            }
          }
        }

        const formattedContent = contentParts.join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `${mcpToolPrefix}_get_standard_by_slug`, slug },
        );

        return {
          content: [
            {
              type: 'text',
              text: formattedContent,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get standard: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_list_recipes`,
    'Get a list of current recipes in Packmind',
    {},
    async () => {
      if (!userContext) {
        throw new Error('User context is required to list recipes');
      }

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const globalSpace = await getGlobalSpace(fastify, organizationId);

        const recipes = await recipesHexa.listRecipesBySpace({
          organizationId,
          spaceId: globalSpace.id,
          userId: createUserId(userContext.userId),
        });

        if (recipes.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No recipes found for your organization',
              },
            ],
          };
        }

        // Sort alphabetically by slug and limit to 20 recipes
        const sortedRecipes = recipes
          .sort((a, b) => a.slug.localeCompare(b.slug))
          .slice(0, 20);

        // Format as bullet points: • slug: name
        const formattedList = sortedRecipes
          .map((recipe) => `• ${recipe.slug}: ${recipe.name}`)
          .join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `${mcpToolPrefix}_list_recipes` },
        );

        return {
          content: [
            {
              type: 'text',
              text: formattedList,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list recipes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_get_recipe_by_slug`,
    'Get the full content of a recipe by its slug',
    {
      slug: z.string().min(1).describe('The slug of the recipe to retrieve'),
    },
    async ({ slug }) => {
      if (!userContext) {
        throw new Error('User context is required to get recipe by slug');
      }

      try {
        const organizationId = createOrganizationId(userContext.organizationId);

        const recipe = await recipesHexa.findRecipeBySlug(slug, organizationId);

        if (!recipe) {
          return {
            content: [
              {
                type: 'text',
                text: `Recipe with slug '${slug}' not found in your organization`,
              },
            ],
          };
        }

        // Format the recipe content for AI agents
        const formattedContent = [
          `# ${recipe.name}`,
          ``,
          `**Slug:** ${recipe.slug}`,
          `**Version:** ${recipe.version}`,
          ``,
          `---`,
          ``,
          recipe.content,
        ].join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `${mcpToolPrefix}_get_recipe_by_slug`, slug },
        );

        return {
          content: [
            {
              type: 'text',
              text: formattedContent,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get recipe: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  const standardWorkflowStepSchema = z
    .enum(STANDARD_WORKFLOW_STEP_ORDER)
    .describe(
      'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
    );

  mcpServer.tool(
    `${mcpToolPrefix}_create_standard_workflow`,
    'Get step-by-step guidance for the Packmind standard creation workflow. Provide an optional step to retrieve a specific stage.',
    {
      step: standardWorkflowStepSchema.optional(),
    },
    async ({ step }) => {
      const requestedStep = step ?? 'initial-request';

      if (!isStandardWorkflowStep(requestedStep)) {
        const availableSteps = Object.keys(STANDARD_WORKFLOW_STEPS).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Unknown workflow step '${requestedStep}'. Available steps: ${availableSteps}`,
            },
          ],
        };
      }

      // Track analytics event
      if (userContext) {
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          {
            tool: `${mcpToolPrefix}_create_standard_workflow`,
            step: requestedStep,
          },
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: STANDARD_WORKFLOW_STEPS[requestedStep],
          },
        ],
      };
    },
  );

  const recipeWorkflowStepSchema = z
    .enum(RECIPE_WORKFLOW_STEP_ORDER)
    .describe(
      'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
    );

  mcpServer.tool(
    `${mcpToolPrefix}_create_recipe_workflow`,
    'Get step-by-step guidance for the Packmind recipe creation workflow. Provide an optional step to retrieve a specific stage.',
    {
      step: recipeWorkflowStepSchema.optional(),
    },
    async ({ step }) => {
      const requestedStep = step ?? 'initial-request';

      if (!isRecipeWorkflowStep(requestedStep)) {
        const availableSteps = Object.keys(RECIPE_WORKFLOW_STEPS).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Unknown workflow step '${requestedStep}'. Available steps: ${availableSteps}`,
            },
          ],
        };
      }

      // Track analytics event
      if (userContext) {
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          {
            tool: `${mcpToolPrefix}_create_recipe_workflow`,
            step: requestedStep,
          },
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: RECIPE_WORKFLOW_STEPS[requestedStep],
          },
        ],
      };
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_create_standard`,
    'Create a new coding standard with multiple rules and optional examples in a single operation. Do not call this tool directly—you need to first use the tool standard_creation_workflow',
    {
      name: z.string().min(1).describe('The name of the standard to create'),
      description: z
        .string()
        .min(1)
        .describe(
          'A description of the standard, one paragraph maximum, explaining the purpose, context, and when applicable. It sets the context for the rules in the standard. It must NOT contain code examples',
        ),
      summary: z
        .string()
        .min(1)
        .optional()
        .describe(
          'A concise sentence describing the intent of this standard and when it is relevant to apply its rules.',
        ),
      rules: z
        .array(
          z.object({
            content: z
              .string()
              .min(1)
              .describe(
                'A concise sentence for the coding rule that explains its intent, and when and where it should be used. It must start with a verb.',
              ),
            examples: z
              .array(
                z.object({
                  positive: z
                    .string()
                    .describe(
                      'A code snippet that is a valid example of the rule, if applicable. Make sure to use the appropriate language. Code snippet can be multi-line if relevant.',
                    ),
                  negative: z
                    .string()
                    .describe(
                      'A code snippet that is an invalid example of the rule, if applicable. Make sure to use the appropriate language. Code snippet can be multi-line if relevant.',
                    ),
                  language: z
                    .string()
                    .describe(
                      `The programming language of the code snippet, if applicable. Pick from ${getAllProgrammingLanguages()}`,
                    ),
                }),
              )
              .optional()
              .describe(
                'Optional array of code examples demonstrating the rule',
              ),
          }),
        )
        .optional()
        .describe('Array of rules with optional examples for the standard'),
    },
    async ({ name, description, summary, rules = [] }) => {
      if (!userContext) {
        throw new Error('User context is required to create standards');
      }

      try {
        // Process and validate the rules with examples
        const processedRules: RuleWithExamples[] = rules.map((rule) => {
          const processedRule: RuleWithExamples = {
            content: rule.content,
          };

          if (rule.examples && rule.examples.length > 0) {
            processedRule.examples = rule.examples
              .map((example) => {
                const language = stringToProgrammingLanguage(example.language);
                if (!language) {
                  logger.warn(
                    'Invalid programming language provided, skipping example',
                    {
                      language: example.language,
                      ruleContent: rule.content.substring(0, 50) + '...',
                    },
                  );
                  return null;
                }
                return {
                  positive: extractCodeFromMarkdown(example.positive),
                  negative: extractCodeFromMarkdown(example.negative),
                  language: language,
                };
              })
              .filter(
                (example) => example !== null,
              ) as RuleWithExamples['examples'];
          }

          return processedRule;
        });

        const firstSpace = await getGlobalSpace(
          fastify,
          createOrganizationId(userContext.organizationId),
        );
        logger.info('Using first space for standard creation', {
          spaceId: firstSpace.id,
          spaceName: firstSpace.name,
          organizationId: userContext.organizationId,
        });

        const standard = await standardsHexa.createStandardWithExamples({
          name,
          description,
          summary,
          rules: processedRules,
          organizationId: createOrganizationId(userContext.organizationId),
          userId: createUserId(userContext.userId),
          scope: null,
          spaceId: firstSpace.id,
        });

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `${mcpToolPrefix}_create_standard` },
        );

        return {
          content: [
            {
              type: 'text',
              text: `Standard '${standard.slug}' has been created successfully with ${processedRules.length} rules and ${processedRules.reduce((sum, r) => sum + (r.examples?.length || 0), 0)} examples.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create standard: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  const addRuleWorkflowStepSchema = z
    .enum(ADD_RULE_WORKFLOW_STEP_ORDER)
    .describe(
      'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
    );

  mcpServer.tool(
    `${mcpToolPrefix}_add_rule_to_standard_workflow`,
    'Get step-by-step guidance for adding a new rule to an existing Packmind standard. Provide an optional step to retrieve a specific stage.',
    {
      step: addRuleWorkflowStepSchema.optional(),
    },
    async ({ step }) => {
      const requestedStep = step ?? 'initial-request';

      if (!isAddRuleWorkflowStep(requestedStep)) {
        const availableSteps = Object.keys(ADD_RULE_WORKFLOW_STEPS).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Unknown workflow step '${requestedStep}'. Available steps: ${availableSteps}`,
            },
          ],
        };
      }

      // Track analytics event
      if (userContext) {
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          {
            tool: `${mcpToolPrefix}_add_rule_to_standard_workflow`,
            step: requestedStep,
          },
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: ADD_RULE_WORKFLOW_STEPS[requestedStep],
          },
        ],
      };
    },
  );

  mcpServer.tool(
    `${mcpToolPrefix}_onboarding`,
    'Get onboarding workflows for coding standards creation. Returns mode selection if no workflow specified, or specific workflow content.',
    {
      workflow: z
        .string()
        .optional()
        .describe(
          'The workflow name to retrieve. Available: codebase-analysis, git-history, documentation, ai-instructions, web-research',
        ),
    },
    async ({ workflow }) => {
      try {
        // If no workflow specified, return mode selection
        logger.info(`Onboarding tool called with workflow: ${workflow}`);

        // Track analytics event
        if (userContext) {
          analyticsAdapter.trackEvent(
            createUserId(userContext.userId),
            createOrganizationId(userContext.organizationId),
            'mcp_tool_call',
            {
              tool: `${mcpToolPrefix}_onboarding`,
              step: workflow || 'mode-selection',
            },
          );
        }

        if (!workflow) {
          return {
            content: [
              {
                type: 'text',
                text: ONBOARDING_PROMPTS['mode-selection'],
              },
            ],
          };
        }

        // Check if the requested workflow exists
        if (workflow in ONBOARDING_PROMPTS) {
          return {
            content: [
              {
                type: 'text',
                text: ONBOARDING_PROMPTS[
                  workflow as keyof typeof ONBOARDING_PROMPTS
                ],
              },
            ],
          };
        }

        // Workflow not found
        return {
          content: [
            {
              type: 'text',
              text: `No workflow found for '${workflow}'. Available workflows: ${Object.keys(
                ONBOARDING_PROMPTS,
              )
                .filter((k) => k !== 'mode-selection')
                .join(', ')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to retrieve onboarding content: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  return mcpServer;
}
