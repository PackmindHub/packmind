import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from './types';

export function registerPushChangesTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, logger } = dependencies;

  type PushChangesInput = {
    changes: {
      newRule: string;
      oldRule?: string;
      operation: string;
      standard: string;
    }[];
  };

  registerMcpTool(
    mcpServer,
    `push_changes`,
    {
      title: 'Push changes to Packmind',
      description: 'Push changes.yaml file to standards.',
      inputSchema: {
        changes: z.array(
          z.object({
            newRule: z.string(),
            oldRule: z.string().optional(),
            operation: z.string(),
            standard: z.string(),
          }),
        ),
      },
    },
    async (input: PushChangesInput) => {
      const { changes } = input;
      if (!changes) {
        throw new Error('Changes are required to push');
      }

      if (!userContext) {
        throw new Error('User context is required to push changes');
      }

      logger.info('Processing standard changes from MCP', {
        changesCount: changes.length,
        userId: userContext.userId,
        organizationId: userContext.organizationId,
      });

      try {
        const standardsHexa = fastify.standardsHexa();
        if (!standardsHexa) {
          throw new Error('StandardsHexa not available');
        }

        const standardsAdapter = standardsHexa.getAdapter();
        const result = await standardsAdapter.processStandardChanges({
          userId: createUserId(userContext.userId),
          organizationId: createOrganizationId(userContext.organizationId),
          changes,
        });

        logger.info('Standard changes processed successfully', {
          succeeded: result.succeeded.length,
          failed: result.failed.length,
        });

        // Build response message
        const successMessages = result.succeeded.map(
          (s) =>
            `✓ Added rule to standard '${s.standardSlug}' (v${s.standardVersion.version})`,
        );

        const failureMessages = result.failed.map(
          (f) => `✗ Failed to add rule to '${f.standardSlug}': ${f.error}`,
        );

        const summaryMessage = `Processed ${changes.length} change(s): ${result.succeeded.length} succeeded, ${result.failed.length} failed`;

        const allMessages = [
          summaryMessage,
          '',
          ...successMessages,
          ...failureMessages,
        ].join('\n');

        return {
          content: [
            {
              type: 'text',
              text: allMessages,
            },
          ],
        };
      } catch (error) {
        logger.error('Error processing standard changes', {
          error: error instanceof Error ? error.message : String(error),
          userId: userContext.userId,
          organizationId: userContext.organizationId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error processing changes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
