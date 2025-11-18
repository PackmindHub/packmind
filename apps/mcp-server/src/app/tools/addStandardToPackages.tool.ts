import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { ToolDependencies } from './types';

export function registerAddStandardToPackagesTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger, mcpToolPrefix } =
    dependencies;

  mcpServer.tool(
    `${mcpToolPrefix}_add_standard_to_packages`,
    'Add an existing standard to one or more packages.',
    {
      standardSlug: z
        .string()
        .min(1)
        .describe('The slug of the standard to add to packages'),
      packageSlugs: z
        .array(z.string())
        .min(1)
        .describe('Array of package slugs to add the standard to'),
    },
    async ({ standardSlug, packageSlugs }) => {
      if (!userContext) {
        throw new Error(
          'User context is required to add standards to packages',
        );
      }

      const standardsHexa = fastify.standardsHexa();
      const deploymentsHexa = fastify.deploymentsHexa();

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const userId = createUserId(userContext.userId);

        // Find the standard by slug
        const standard = await standardsHexa
          .getAdapter()
          .findStandardBySlug(standardSlug, organizationId);

        if (!standard) {
          return {
            content: [
              {
                type: 'text',
                text: `Standard with slug '${standardSlug}' not found`,
              },
            ],
          };
        }

        // Fetch all packages to validate slugs
        const { packages } = await deploymentsHexa.getAdapter().listPackages({
          userId: userContext.userId,
          organizationId,
        });

        // Filter to requested packages
        const requestedPackages = packages.filter((pkg) =>
          packageSlugs.includes(pkg.slug),
        );

        if (requestedPackages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `None of the requested packages were found: ${packageSlugs.join(', ')}`,
              },
            ],
          };
        }

        // Track missing packages
        const foundSlugs = new Set(requestedPackages.map((p) => p.slug));
        const missingSlugs = packageSlugs.filter(
          (slug) => !foundSlugs.has(slug),
        );

        // Add standard to each package
        const results: string[] = [];
        for (const pkg of requestedPackages) {
          try {
            // Validate package belongs to same space as standard
            if (pkg.spaceId !== standard.spaceId) {
              logger.warn('Package does not belong to same space as standard', {
                packageSlug: pkg.slug,
                packageSpaceId: pkg.spaceId,
                standardSpaceId: standard.spaceId,
              });
              results.push(`❌ ${pkg.slug}: belongs to different space`);
              continue;
            }

            await deploymentsHexa.getAdapter().addArtefactsToPackage({
              userId: userContext.userId,
              organizationId,
              packageId: pkg.id,
              standardIds: [standard.id],
            });

            results.push(`✓ ${pkg.slug}`);
            logger.info('Standard added to package successfully', {
              packageSlug: pkg.slug,
              standardSlug,
            });
          } catch (error) {
            logger.error('Failed to add standard to package', {
              packageSlug: pkg.slug,
              standardSlug,
              error: error instanceof Error ? error.message : String(error),
            });
            results.push(
              `❌ ${pkg.slug}: ${error instanceof Error ? error.message : 'unknown error'}`,
            );
          }
        }

        // Track analytics event
        analyticsAdapter.trackEvent(userId, organizationId, 'mcp_tool_call', {
          tool: `${mcpToolPrefix}_add_standard_to_packages`,
          standardSlug,
          packageCount: requestedPackages.length,
        });

        // Build response message
        let message = `Standard '${standardSlug}' added to packages:\n\n${results.join('\n')}`;

        if (missingSlugs.length > 0) {
          message += `\n\nPackages not found: ${missingSlugs.join(', ')}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to add standard to packages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
