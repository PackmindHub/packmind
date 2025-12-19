import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PackmindLogger } from '@packmind/logger';
import { extractCodeFromMarkdown } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  getAllProgrammingLanguages,
  RuleWithExamples,
  SpaceId,
  StandardId,
  stringToProgrammingLanguage,
} from '@packmind/types';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies, UserContext } from './types';
import { getGlobalSpace } from './utils';

const DEFAULT_PACKAGE_NAME = 'Default';
const DEFAULT_PACKAGE_DESCRIPTION =
  'Default package for organizing your standards and recipes';

// Define schemas separately to avoid deep type instantiation
const ruleExampleSchema = z.object({
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
});

const standardRuleSchema = z.object({
  content: z
    .string()
    .min(1)
    .describe(
      'A concise sentence for the coding rule that explains its intent, and when and where it should be used. It must start with a verb.',
    ),
  examples: z
    .array(ruleExampleSchema)
    .optional()
    .describe('Optional array of code examples demonstrating the rule'),
});

type SaveStandardInput = {
  name: string;
  description: string;
  summary?: string;
  rules?: Array<{
    content: string;
    examples?: Array<{ positive: string; negative: string; language: string }>;
  }>;
  packageSlugs?: string[];
};

async function ensureDefaultPackageWithStandard(
  fastify: FastifyInstance,
  userContext: UserContext,
  spaceId: SpaceId,
  standardId: StandardId,
  logger: PackmindLogger,
): Promise<string> {
  const deploymentsHexa = fastify.deploymentsHexa();
  if (!deploymentsHexa) {
    throw new Error('Deployments module not available');
  }

  const deploymentsAdapter = deploymentsHexa.getAdapter();
  const organizationId = createOrganizationId(userContext.organizationId);
  const userId = userContext.userId;

  // List existing packages to check if Default package exists
  const { packages } = await deploymentsAdapter.listPackages({
    userId,
    organizationId,
  });

  const defaultPackage = packages.find(
    (pkg) => pkg.name === DEFAULT_PACKAGE_NAME,
  );

  if (defaultPackage) {
    logger.info('Default package exists, adding standard to it', {
      packageId: defaultPackage.id,
      packageSlug: defaultPackage.slug,
      standardId,
    });

    // Add standard to existing Default package
    await deploymentsAdapter.addArtefactsToPackage({
      userId,
      organizationId,
      packageId: defaultPackage.id,
      standardIds: [standardId],
    });

    return defaultPackage.slug;
  }

  // Create new Default package with the standard
  logger.info('Creating Default package for trial user', {
    spaceId,
    standardId,
  });

  const { package: newPackage } = await deploymentsAdapter.createPackage({
    userId,
    organizationId,
    spaceId,
    name: DEFAULT_PACKAGE_NAME,
    description: DEFAULT_PACKAGE_DESCRIPTION,
    recipeIds: [],
    standardIds: [standardId],
  });

  logger.info('Default package created successfully', {
    packageId: newPackage.id,
    packageSlug: newPackage.slug,
    standardId,
  });

  return newPackage.slug;
}

export function registerSaveStandardTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger } = dependencies;

  registerMcpTool(
    mcpServer,
    `save_standard`,
    {
      title: 'Save Standard',
      description:
        'Create a new coding standard with multiple rules and optional examples in a single operation. Do not call this tool directly—you need to first use the tool packmind_create_standard.',
      inputSchema: {
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
          .array(standardRuleSchema)
          .optional()
          .describe('Array of rules with optional examples for the standard'),
        packageSlugs: z
          .array(z.string())
          .optional()
          .describe(
            'Optional array of package slugs to add this standard to after creation',
          ),
      },
    },
    async (input: SaveStandardInput) => {
      const { name, description, summary, rules = [], packageSlugs } = input;
      if (!userContext) {
        throw new Error('User context is required to create standards');
      }

      const standardsHexa = fastify.standardsHexa();

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

        const standard = await standardsHexa
          .getAdapter()
          .createStandardWithPackages({
            name,
            description,
            summary,
            rules: processedRules,
            organizationId: createOrganizationId(userContext.organizationId),
            userId: createUserId(userContext.userId),
            scope: null,
            spaceId: firstSpace.id,
            packageSlugs,
          });

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `save_standard` },
        );

        // For trial users, ensure the standard is added to the Default package
        let trialPackageSlug: string | null = null;
        const accountsAdapter = fastify.accountsHexa().getAdapter();
        const user = await accountsAdapter.getUserById(
          createUserId(userContext.userId),
        );

        if (user?.trial) {
          logger.info('Trial user detected, ensuring Default package exists', {
            userId: userContext.userId,
          });

          trialPackageSlug = await ensureDefaultPackageWithStandard(
            fastify,
            userContext,
            firstSpace.id,
            standard.id,
            logger,
          );
        }

        const baseMessage = `Standard '${standard.slug}' has been created successfully with ${processedRules.length} rules and ${processedRules.reduce((sum, r) => sum + (r.examples?.length || 0), 0)} examples.`;

        if (trialPackageSlug) {
          return {
            content: [
              {
                type: 'text',
                text: `${baseMessage}\n\n**IMPORTANT: You MUST now call packmind_install_package with packageSlugs: ["${trialPackageSlug}"] to deploy the standard to the user's local environment. This is a required step - the standard will not be available to the user until you complete this action.**`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: baseMessage,
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
}
