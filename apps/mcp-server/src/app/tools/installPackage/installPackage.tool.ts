import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from '../types';

export function registerInstallPackageTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { userContext, analyticsAdapter, logger } = dependencies;

  registerMcpTool(
    mcpServer,
    `install_package`,
    {
      title: 'Install Package',
      description:
        'Install a Packmind package. Returns instructions on how to install using packmind-cli or, if not available, using the render_package tool.',
      inputSchema: {
        packageSlug: z
          .string()
          .describe(
            'The package slug to install. Use packmind_list_packages to find available packages.',
          ),
        relativePath: z
          .string()
          .describe(
            'The target directory where files should be installed (e.g., "/" for root, "/packages/my-app/" for a specific folder)',
          ),
      },
    },
    async ({
      packageSlug,
      relativePath,
    }: {
      packageSlug?: string;
      relativePath?: string;
    }) => {
      if (!userContext) {
        throw new Error('User context is required to install a package');
      }

      const organizationId = createOrganizationId(userContext.organizationId);
      const userId = createUserId(userContext.userId);

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

Then call the \`packmind_render_package\` MCP tool with these parameters:
- \`packageSlug\`: the slug of the package to install (e.g., "new-package")
- \`installedPackages\`: array of existing package slugs from packmind.json (e.g., ["existing-package-1", "existing-package-2"])
- \`relativePath\`: the target directory (e.g., "/" or "/packages/my-app/")
- \`gitRemoteUrl\`: run \`git remote get-url origin\` to get this value, use empty string "" if unable to retrieve
- \`gitBranch\`: run \`git branch --show-current\` to get this value, use empty string "" if unable to retrieve

Then apply the file updates returned by the tool.`;

      logger.info('Returning installation instructions', {
        organizationId,
        userId,
        packageSlug,
        relativePath,
      });

      analyticsAdapter.trackEvent(userId, organizationId, 'mcp_tool_call', {
        tool: 'install_package',
        packageSlug: packageSlug || '',
        relativePath: relativePath || '',
      });

      return {
        content: [
          {
            type: 'text',
            text: instructions,
          },
        ],
      };
    },
  );
}
