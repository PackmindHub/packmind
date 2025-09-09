import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import {
  getAllProgrammingLanguages,
  LogLevel,
  PackmindLogger,
  ProgrammingLanguage,
  stringToProgrammingLanguage,
} from '@packmind/shared';
import { createOrganizationId, createUserId } from '@packmind/accounts';

interface UserContext {
  username: string;
  userId: string;
  organizationId: string;
}

const mcpToolPrefix = 'packmind';

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
    user: userContext ? userContext.username : 'anonymous',
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
  logger.debug('Attempting to call fastify.standardsHexa()');
  const recipesUsageHexa = fastify.recipesUsageHexa();

  mcpServer.tool(
    `${mcpToolPrefix}_say_hello`,
    'Just answer "Hello" to the user if he asks you to say hello',
    {
      message: z.string().min(1).describe('The message to say to the user'),
    },
    async ({ message }, extra) => {
      try {
        const userAgent = extra.requestInfo.headers['user-agent'];
        logger.info(`Say hello called with user-agent: ${userAgent}`);
      } catch {
        // No-op
      }

      const greeting = userContext
        ? `Hello ${userContext.username}`
        : 'Hello you';

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
    },
    async ({ name, content }) => {
      if (!userContext) {
        throw new Error('User context is required to create recipes');
      }

      const recipe = await recipesHexa.captureRecipe({
        name,
        content,
        organizationId: createOrganizationId(userContext.organizationId),
        userId: createUserId(userContext.userId),
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
    },
    async ({ recipesSlug, aiAgent, gitRepo }) => {
      if (!userContext) {
        throw new Error('User context is required to track recipe usage');
      }

      try {
        const usageRecords = await recipesUsageHexa.trackRecipeUsage(
          recipesSlug,
          aiAgent,
          createUserId(userContext.userId),
          gitRepo,
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

  return mcpServer;
}
