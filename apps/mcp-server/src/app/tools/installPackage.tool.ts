import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from './types';

export function registerInstallPackageTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger } = dependencies;

  registerMcpTool(
    mcpServer,
    `install_package`,
    {
      title: 'Install Package',
      description:
        'Install a Packmind package containing coding standards and recipes. This tool returns file updates that YOU MUST APPLY to the codebase: create new files, update existing files with the provided content, and delete files as specified. After calling this tool, iterate through the fileUpdates.createOrUpdate array and write each file to disk at the specified path with the provided content. Also delete any files listed in fileUpdates.delete.',
      inputSchema: {
        packageSlug: z
          .string()
          .min(1)
          .describe('The slug of the package to install'),
        relativePath: z
          .string()
          .default('/')
          .describe(
            'The target path within the repository where files should be installed (e.g., "/" for root, "/packages/my-app/" for a specific folder)',
          ),
        gitRemoteUrl: z
          .string()
          .optional()
          .describe(
            'REQUIRED when running inside a git repository: The git remote URL (run "git remote get-url origin" to obtain it). Example: https://github.com/owner/repo. This enables tracking of package deployments.',
          ),
        gitBranch: z
          .string()
          .default('main')
          .describe(
            'REQUIRED when running inside a git repository: The current git branch name (run "git branch --show-current" to obtain it). Defaults to "main" if not provided.',
          ),
      },
    },
    async ({
      packageSlug,
      relativePath,
      gitRemoteUrl,
      gitBranch,
    }: {
      packageSlug: string;
      relativePath: string;
      gitRemoteUrl?: string;
      gitBranch: string;
    }) => {
      if (!userContext) {
        throw new Error('User context is required to install a package');
      }

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const userId = createUserId(userContext.userId);
        const deploymentsHexa = fastify.deploymentsHexa();

        if (!deploymentsHexa) {
          throw new Error('DeploymentsHexa not available');
        }

        const deploymentsAdapter = deploymentsHexa.getAdapter();

        logger.info('Installing package via MCP tool', {
          packageSlug,
          relativePath,
          gitRemoteUrl,
          gitBranch,
          organizationId,
          userId,
        });

        // Generate file updates using PullContentUseCase
        const pullContentResult = await deploymentsAdapter.pullAllContent({
          userId: userContext.userId,
          organizationId,
          packagesSlugs: [packageSlug],
        });

        logger.info('Generated file updates for package installation', {
          packageSlug,
          createOrUpdateCount:
            pullContentResult.fileUpdates.createOrUpdate.length,
          deleteCount: pullContentResult.fileUpdates.delete.length,
        });

        // If gitRemoteUrl is provided, record the distribution
        let distributionId: string | undefined;
        if (gitRemoteUrl) {
          try {
            const notifyResult = await deploymentsAdapter.notifyDistribution({
              userId: userContext.userId,
              organizationId,
              distributedPackages: [packageSlug],
              gitRemoteUrl,
              gitBranch,
              relativePath,
            });
            distributionId = notifyResult.deploymentId;

            logger.info('Recorded distribution for package installation', {
              packageSlug,
              distributionId,
              gitRemoteUrl,
              gitBranch,
              relativePath,
            });
          } catch (notifyError) {
            // Log the error but don't fail the installation
            // The file updates are still valid even if recording fails
            logger.error(
              'Failed to record distribution, continuing with file updates',
              {
                packageSlug,
                gitRemoteUrl,
                error:
                  notifyError instanceof Error
                    ? notifyError.message
                    : String(notifyError),
              },
            );
          }
        }

        // Track analytics event
        analyticsAdapter.trackEvent(userId, organizationId, 'mcp_tool_call', {
          tool: 'install_package',
          packageSlug,
          relativePath,
          hasGitRemoteUrl: gitRemoteUrl ? 'true' : 'false',
          distributionRecorded: distributionId ? 'true' : 'false',
        });

        // Format file updates for the response
        const fileUpdates = pullContentResult.fileUpdates;
        const responseData = {
          packageSlug,
          distributionId,
          fileUpdates: {
            createOrUpdate: fileUpdates.createOrUpdate.map((file) => ({
              path: file.path,
              content: file.content,
              sections: file.sections,
            })),
            delete: fileUpdates.delete.map((file) => ({
              path: file.path,
            })),
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(responseData, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to install package', {
          packageSlug,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text',
              text: `Failed to install package: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
