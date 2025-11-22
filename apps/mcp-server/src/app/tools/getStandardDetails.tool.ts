import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { ToolDependencies } from './types';

export function registerGetStandardDetailsTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter } = dependencies;

  mcpServer.tool(
    `get_standard_details`,
    'Get the full content of a standard including its rules and examples by its slug.',
    {
      standardSlug: z
        .string()
        .min(1)
        .describe('The slug of the standard to retrieve'),
    },
    async ({ standardSlug }) => {
      if (!userContext) {
        throw new Error('User context is required to get standard by slug');
      }

      const standardsHexa = fastify.standardsHexa();

      try {
        const organizationId = createOrganizationId(userContext.organizationId);

        const standard = await standardsHexa
          .getAdapter()
          .findStandardBySlug(standardSlug, organizationId);

        if (!standard) {
          return {
            content: [
              {
                type: 'text',
                text: `Standard with slug '${standardSlug}' not found in your organization`,
              },
            ],
          };
        }

        // Get rules for this standard
        const rules = await standardsHexa
          .getAdapter()
          .getRulesByStandardId(standard.id);

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
            const examples = await standardsHexa.getAdapter().getRuleExamples({
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
          { tool: `get_standard_details`, standardSlug },
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
}
