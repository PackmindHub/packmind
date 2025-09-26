import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import {
  getAllProgrammingLanguages,
  LogLevel,
  PackmindLogger,
  ProgrammingLanguage,
  RuleWithExamples,
  stringToProgrammingLanguage,
} from '@packmind/shared';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import packmindOnboardingModeSelection from './prompts/packmind-onboarding-mode-selection';
import packmindOnboardingCodebaseAnalysis from './prompts/packmind-onboarding-codebase-analysis';
import packmindOnboardingGitHistory from './prompts/packmind-onboarding-git-history';
import packmindOnboardingDocumentation from './prompts/packmind-onboarding-documentation';
import packmindOnboardingAiInstructions from './prompts/packmind-onboarding-ai-instructions';
import packmindOnboardingWebResearch from './prompts/packmind-onboarding-web-research';

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
    user: userContext ? userContext.email : 'anonymous',
  });

  // Debug logging for fastify decorators
  logger.debug('Checking fastify decorators:', {
    hasHexaRegistry: typeof fastify.hexaRegistry,
    hasAccountsHexa: typeof fastify.accountsHexa,
    hasGitHexa: typeof fastify.gitHexa,
    hasRecipesHexa: typeof fastify.recipesHexa,
    hasRecipesUsageHexa: typeof fastify.recipesUsageHexa,
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
  logger.debug('Attempting to call fastify.recipesUsageHexa()');
  const recipesUsageHexa = fastify.recipesUsageHexa();

  // Set up deployment port injection for analytics
  logger.debug('Setting up deployment port injection for analytics');
  const deploymentPort = deploymentsHexa.getDeploymentsUseCases();
  recipesUsageHexa.setDeploymentPort(deploymentPort);
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
    'Captures a reusable process or procedure as a structured Packmind recipe using available context, code, or reasoning.',
    {
      name: z.string().min(1).describe('The name of the recipe to create'),
      content: z
        .string()
        .min(1)
        .describe('A description of the recipe to create (in markdown format)'),
      summary: z
        .string()
        .min(1)
        .optional()
        .describe(
          'A concise sentence describing the intent of this recipe (what it does) and its value (why it is useful) and when it is relevant to use it',
        ),
    },
    async ({ name, content, summary }) => {
      if (!userContext) {
        throw new Error('User context is required to create recipes');
      }

      const recipe = await recipesHexa.captureRecipe({
        name,
        content,
        organizationId: createOrganizationId(userContext.organizationId),
        userId: createUserId(userContext.userId),
        summary,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Recipe '${recipe.slug}' has been created successfully.`,
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
        const usageRecords = await recipesUsageHexa.trackRecipeUsage({
          recipeSlugs: recipesSlug,
          aiAgent,
          userId: userContext.userId,
          organizationId: userContext.organizationId,
          gitRepo,
          target,
        });

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
    'Add a new coding rule to an existing standard identified by its slug',
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
            positive: positiveExample || '',
            negative: negativeExample || '',
            lang:
              stringToProgrammingLanguage(language) ||
              ProgrammingLanguage.JAVASCRIPT,
            organizationId: createOrganizationId(userContext.organizationId),
            userId: createUserId(userContext.userId),
          });
        }

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
        const standards = await standardsHexa.listStandardsByOrganization(
          createOrganizationId(userContext.organizationId),
        );

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
    `${mcpToolPrefix}_create_standard`,
    'Create a new coding standard with multiple rules and optional examples in a single operation',
    {
      name: z.string().min(1).describe('The name of the standard to create'),
      description: z
        .string()
        .min(1)
        .describe(
          'A comprehensive description of the standard and its purpose (markdown format)',
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
                'A descriptive name for the coding rule that explains its intention and how it should be used. It must start with a verb to give the intention.',
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
                  positive: example.positive,
                  negative: example.negative,
                  language: language,
                };
              })
              .filter(
                (example) => example !== null,
              ) as RuleWithExamples['examples'];
          }

          return processedRule;
        });

        const standard = await standardsHexa.createStandardWithExamples({
          name,
          description,
          summary,
          rules: processedRules,
          organizationId: createOrganizationId(userContext.organizationId),
          userId: createUserId(userContext.userId),
          scope: null,
        });

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
        console.log('Onboarding tool called with workflow:', workflow);
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
