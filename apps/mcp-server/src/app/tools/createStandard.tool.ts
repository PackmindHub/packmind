import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractCodeFromMarkdown } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  getAllProgrammingLanguages,
  RuleWithExamples,
  stringToProgrammingLanguage,
} from '@packmind/types';
import { z } from 'zod';
import { ToolDependencies } from './types';
import { getGlobalSpace } from './utils';

export function registerCreateStandardTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger, mcpToolPrefix } =
    dependencies;

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
          .createStandardWithExamples({
            name,
            description,
            summary: summary ?? null,
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
}
