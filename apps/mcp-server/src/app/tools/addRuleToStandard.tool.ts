import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractCodeFromMarkdown } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  getAllProgrammingLanguages,
  ProgrammingLanguage,
  stringToProgrammingLanguage,
} from '@packmind/types';
import { z } from 'zod';
import { ToolDependencies } from './types';

export function registerAddRuleToStandardTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger, mcpToolPrefix } =
    dependencies;

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

      const standardsHexa = fastify.standardsHexa();

      try {
        const newStandardVersion = await standardsHexa
          .getAdapter()
          .addRuleToStandard({
            standardSlug: standardSlug.toLowerCase(),
            ruleContent,
            organizationId: createOrganizationId(userContext.organizationId),
            userId: createUserId(userContext.userId),
          });

        const rules = await standardsHexa
          .getAdapter()
          .getRulesByStandardId(newStandardVersion.standardId);
        const newRule = rules.filter((rule) => rule.content === ruleContent);

        const codeSnippetProvided =
          (positiveExample?.length ?? 0) > 0 ||
          (negativeExample?.length ?? 0) > 0;
        if (newRule && codeSnippetProvided) {
          logger.info('Creating rule example');
          await standardsHexa.getAdapter().createRuleExample({
            ruleId: newRule[0].id,
            positive: extractCodeFromMarkdown(positiveExample ?? '') || '',
            negative: extractCodeFromMarkdown(negativeExample ?? '') || '',
            lang:
              stringToProgrammingLanguage(language ?? '') ||
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
}
