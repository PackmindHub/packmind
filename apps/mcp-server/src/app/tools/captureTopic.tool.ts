import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CodeExample,
  createOrganizationId,
  createUserId,
  TopicCaptureContext,
} from '@packmind/types';
import { z } from 'zod';
import { ToolDependencies } from './types';
import { getGlobalSpace } from './utils';

export function registerCaptureTopicTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger, mcpToolPrefix } =
    dependencies;

  mcpServer.tool(
    `${mcpToolPrefix}_capture_topic`,
    'Capture a small, focused coding pattern or learning. Each topic should be atomic and specific - call this tool multiple times to capture multiple distinct learnings rather than combining them into one large topic.',
    {
      title: z
        .string()
        .min(1)
        .describe(
          'A specific, focused title describing one coding pattern or practice (e.g., "Use const for immutable variables", "Prefer find over filter[0]")',
        ),
      content: z
        .string()
        .min(1)
        .describe(
          'Brief explanation of the learning, including context and rationale. Keep it succinct and focused on this specific pattern. [Markdown formatted]',
        ),
      codeExamples: z
        .array(
          z.object({
            language: z
              .string()
              .min(1)
              .describe(
                'Programming language of the code example (e.g., "typescript", "python")',
              ),
            code: z
              .string()
              .min(1)
              .describe(
                'A small, focused code example demonstrating this specific pattern',
              ),
          }),
        )
        .optional()
        .describe(
          'Optional array of code examples. Each example should be small and focused on demonstrating this specific learning.',
        ),
    },
    async ({ title, content, codeExamples }) => {
      if (!userContext) {
        throw new Error('User context is required to capture topics');
      }

      const learningsHexa = fastify.learningsHexa();

      const globalSpace = await getGlobalSpace(
        fastify,
        createOrganizationId(userContext.organizationId),
      );
      logger.info('Using global space for topic capture', {
        spaceId: globalSpace.id,
        spaceName: globalSpace.name,
        organizationId: userContext.organizationId,
      });

      const topic = await learningsHexa.getAdapter().captureTopic({
        title,
        content,
        codeExamples: (codeExamples || []) as CodeExample[],
        captureContext: TopicCaptureContext.MCP_TOOL,
        userId: userContext.userId,
        spaceId: globalSpace.id,
        organizationId: userContext.organizationId,
      });

      // Track analytics event
      analyticsAdapter.trackEvent(
        createUserId(userContext.userId),
        createOrganizationId(userContext.organizationId),
        'mcp_tool_call',
        { tool: `${mcpToolPrefix}_capture_topic` },
      );

      return {
        content: [
          {
            type: 'text',
            text: `Topic '${topic.title}' captured successfully. Feel free to capture additional small, focused learnings by calling this tool again for each distinct pattern or practice you identify.`,
          },
        ],
      };
    },
  );
}
