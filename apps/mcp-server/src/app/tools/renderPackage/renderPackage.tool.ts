import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from '../types';

export function registerRenderPackageTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger } = dependencies;

  registerMcpTool(
    mcpServer,
    `render_package`,
    {
      title: 'Render Package',
      description:
        'Render a Packmind package as file updates for the agent to apply. This tool is called after install_package when packmind-cli is not available.',
      inputSchema: {
        packageSlug: z
          .string()
          .describe(
            'The package slug to render. Use packmind_list_packages to find available packages.',
          ),
        installedPackages: z
          .array(z.string())
          .optional()
          .describe(
            'Array of already installed package slugs from packmind.json. Read the packmind.json file and extract the package slugs from the "packages" section.',
          ),
        relativePath: z
          .string()
          .describe(
            'The target directory where files should be installed (e.g., "/" for root, "/packages/my-app/" for a specific folder)',
          ),
        gitRemoteUrl: z
          .string()
          .describe(
            'The git remote URL. Run "git remote get-url origin" to obtain it. Use an empty string if unable to retrieve.',
          ),
        gitBranch: z
          .string()
          .describe(
            'The git branch name. Run "git branch --show-current" to obtain it. Use an empty string if unable to retrieve.',
          ),
      },
    },
    async ({
      packageSlug,
      installedPackages,
      relativePath,
      gitRemoteUrl,
      gitBranch,
    }: {
      packageSlug: string;
      installedPackages?: string[];
      relativePath: string;
      gitRemoteUrl: string;
      gitBranch: string;
    }) => {
      if (!userContext) {
        throw new Error('User context is required to render a package');
      }

      const organizationId = createOrganizationId(userContext.organizationId);
      const userId = createUserId(userContext.userId);

      if (!packageSlug) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: packageSlug is required. Use packmind_list_packages to find available packages.',
            },
          ],
        };
      }

      const safeRelativePath = relativePath || '/';
      const safeGitBranch = gitBranch || 'main';
      const allPackageSlugs = [packageSlug, ...(installedPackages || [])];

      try {
        const deploymentsHexa = fastify.deploymentsHexa();

        if (!deploymentsHexa) {
          throw new Error('DeploymentsHexa not available');
        }

        const deploymentsAdapter = deploymentsHexa.getAdapter();

        logger.info('Rendering packages via MCP tool', {
          packageSlug,
          installedPackages,
          allPackageSlugs,
          relativePath: safeRelativePath,
          gitRemoteUrl,
          gitBranch: safeGitBranch,
          organizationId,
          userId,
        });

        // Generate file updates using PullContentUseCase
        const pullContentResult = await deploymentsAdapter.pullAllContent({
          userId: userContext.userId,
          organizationId,
          packagesSlugs: allPackageSlugs,
          source: 'mcp',
        });

        logger.info('Generated file updates for package rendering', {
          allPackageSlugs,
          createOrUpdateCount:
            pullContentResult.fileUpdates.createOrUpdate.length,
          deleteCount: pullContentResult.fileUpdates.delete.length,
        });

        // If gitRemoteUrl is non-empty, record the distribution
        let distributionId: string | undefined;
        if (gitRemoteUrl && gitRemoteUrl.trim().length > 0) {
          try {
            const notifyResult = await deploymentsAdapter.notifyDistribution({
              userId: userContext.userId,
              organizationId,
              distributedPackages: allPackageSlugs,
              gitRemoteUrl,
              gitBranch: safeGitBranch,
              relativePath: safeRelativePath,
            });
            distributionId = notifyResult.deploymentId;

            logger.info('Recorded distribution for package rendering', {
              allPackageSlugs,
              distributionId,
              gitRemoteUrl,
              gitBranch: safeGitBranch,
              relativePath: safeRelativePath,
            });
          } catch (notifyError) {
            logger.error(
              'Failed to record distribution, continuing with file updates',
              {
                allPackageSlugs,
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
          tool: 'render_package',
          packageSlug,
          installedPackages: (installedPackages || []).join(','),
          packageCount: String(allPackageSlugs.length),
          relativePath: safeRelativePath,
          hasGitRemoteUrl: gitRemoteUrl ? 'true' : 'false',
          distributionRecorded: distributionId ? 'true' : 'false',
        });

        // Format file updates for the response
        const fileUpdates = pullContentResult.fileUpdates;
        const responseData = {
          packageSlug,
          installedPackages,
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

        // Build the agent-friendly prompt
        const prompt = `# Package Rendering: ${packageSlug}

You must now apply the following file changes in the \`${safeRelativePath}\` directory.

**IMPORTANT**: The path \`${safeRelativePath}\` is relative to the git repository root or current project directory, NOT the filesystem root. For example, if \`relativePath\` is "/" and the project is at \`/Users/dev/my-project\`, files should be written to \`/Users/dev/my-project/\`, not to \`/\`.

## File Updates

\`\`\`json
${JSON.stringify(responseData.fileUpdates, null, 2)}
\`\`\`

## Instructions

1. **Delete files**: For each file in the \`delete\` array, delete the file at the specified \`path\`.

2. **Create or update files**: For each file in the \`createOrUpdate\` array:
   - If the file has a \`content\` field: Create the file (or replace its entire content if it exists) with the provided content.
   - If the file has a \`sections\` field: For each section in the array:
     - Look for an existing section wrapped between \`<!-- start: \${section.key} -->\` and \`<!-- end: \${section.key} -->\`
     - If the section exists, replace everything between these markers (including the markers) with: \`<!-- start: \${section.key} -->\\n\${section.content}\\n<!-- end: \${section.key} -->\`
     - If the section does not exist, append to the end of the file: \`<!-- start: \${section.key} -->\\n\${section.content}\\n<!-- end: \${section.key} -->\`

3. **Clean up empty files**: After applying section updates, if a file contains only whitespace or markdown comments (e.g., \`<!-- ... -->\`), delete the file entirely instead of leaving it empty.

**Important**: Apply ALL file changes listed above. Do not skip any files.`;

        return {
          content: [
            {
              type: 'text',
              text: prompt,
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to render packages', {
          packageSlug,
          installedPackages,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text',
              text: `Failed to render packages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
