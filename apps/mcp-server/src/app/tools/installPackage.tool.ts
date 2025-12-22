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
        'Install a Packmind package. When called without agentRendering, returns instructions on how to install. When called with agentRendering=true, returns file updates for you to apply.',
      inputSchema: {
        packageSlug: z
          .string()
          .describe(
            'The package slug to install. Use packmind_list_packages to find available packages.',
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
        agentRendering: z
          .boolean()
          .describe(
            'DO NOT set this to true unless explicitly instructed by previous tool output or user input. When false or omitted, returns installation instructions. When true, returns file updates for you to apply.',
          ),
        gitRemoteUrl: z
          .string()
          .optional()
          .describe(
            'The git remote URL. Run "git remote get-url origin" to obtain it.',
          ),
        gitBranch: z
          .string()
          .optional()
          .describe(
            'The git branch name. Run "git branch --show-current" to obtain it.',
          ),
      },
    },
    async ({
      packageSlug,
      installedPackages,
      relativePath,
      agentRendering,
      gitRemoteUrl,
      gitBranch,
    }: {
      packageSlug?: string;
      installedPackages?: string[];
      relativePath?: string;
      agentRendering?: boolean;
      gitRemoteUrl?: string;
      gitBranch?: string;
    }) => {
      if (!userContext) {
        throw new Error('User context is required to install a package');
      }

      const organizationId = createOrganizationId(userContext.organizationId);
      const userId = createUserId(userContext.userId);

      // When agentRendering is false or not provided, return installation instructions
      if (!agentRendering) {
        const instructions = `# Package Installation Instructions

Follow these steps to install a Packmind package:

## Step 1: Find the package
Call the \`packmind_list_packages\` MCP tool to see available packages and find the slug of the package you want to install. If you are unsure which package to install, ask the user to confirm.

## Step 2: Check if packmind-cli is installed
Run: \`which packmind-cli\` or \`packmind-cli --version\`

## Step 3: Install the package

**If packmind-cli IS available:**
Run this command in the target directory:
\`\`\`
packmind-cli install <packageSlug>
\`\`\`

**If packmind-cli is NOT available (do NOT try to install it):**

First, check if a \`packmind.json\` file exists in the target directory. If it exists, read it and extract the list of already installed packages from the \`packages\` section. The file structure is:
\`\`\`json
{
  "packages": {
    "package-slug-1": "*",
    "package-slug-2": "*"
  }
}
\`\`\`

Then call the \`packmind_install_package\` MCP tool with these parameters:
- \`packageSlug\`: the slug of the package to install (e.g., "new-package")
- \`installedPackages\`: array of existing package slugs from packmind.json (e.g., ["existing-package-1", "existing-package-2"])
- \`relativePath\`: the target directory (e.g., "/" or "/packages/my-app/")
- \`agentRendering\`: true
- \`gitRemoteUrl\`: run \`git remote get-url origin\` to get this value
- \`gitBranch\`: run \`git branch --show-current\` to get this value

Then apply the file updates returned by the tool.`;

        logger.info('Returning installation instructions', {
          organizationId,
          userId,
        });

        analyticsAdapter.trackEvent(userId, organizationId, 'mcp_tool_call', {
          tool: 'install_package',
          mode: 'instructions',
        });

        return {
          content: [
            {
              type: 'text',
              text: instructions,
            },
          ],
        };
      }

      // agentRendering is true - call use cases and return file updates prompt
      if (!packageSlug) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: packageSlug is required when agentRendering is true. Use packmind_list_packages to find available packages.',
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

        logger.info('Installing packages via MCP tool with agentRendering', {
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
        });

        logger.info('Generated file updates for package installation', {
          allPackageSlugs,
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
              distributedPackages: allPackageSlugs,
              gitRemoteUrl,
              gitBranch: safeGitBranch,
              relativePath: safeRelativePath,
            });
            distributionId = notifyResult.deploymentId;

            logger.info('Recorded distribution for package installation', {
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
          tool: 'install_package',
          packageSlug,
          installedPackages: (installedPackages || []).join(','),
          packageCount: String(allPackageSlugs.length),
          relativePath: safeRelativePath,
          mode: 'agent_rendering',
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
        const prompt = `# Package Installation: ${packageSlug}

You must now apply the following file changes in the \`${safeRelativePath}\` directory.

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
        logger.error('Failed to install packages', {
          packageSlug,
          installedPackages,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text',
              text: `Failed to install packages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
