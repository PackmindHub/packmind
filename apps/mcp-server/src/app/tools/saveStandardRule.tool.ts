import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractCodeFromMarkdown } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  getAllProgrammingLanguages,
  ProgrammingLanguage,
  RuleExampleInput,
  stringToProgrammingLanguage,
} from '@packmind/types';
import { z } from 'zod';
import {
  buildTrialActivationPrompt,
  buildTrialInstallPrompt,
  ensureDefaultPackageWithArtifact,
  isTrialUser,
  shouldPromptForTrialActivation,
} from './trialPackageUtils';
import { registerMcpTool, ToolDependencies } from './types';
import { getGlobalSpace } from './utils';

export function registerSaveStandardRuleTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger } = dependencies;

  type SaveStandardRuleInput = {
    standardSlug: string;
    ruleContent: string;
    positiveExample?: string;
    negativeExample?: string;
    language?: string;
  };

  registerMcpTool(
    mcpServer,
    `save_standard_rule`,
    {
      title: 'Save Standard Rule',
      description:
        'Add a new coding rule to an existing standard identified by its slug. Do not call this tool directly—you need to first use the tool packmind_create_standard_rule.',
      inputSchema: {
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
    },
    async (input: SaveStandardRuleInput) => {
      const {
        standardSlug,
        ruleContent,
        positiveExample,
        negativeExample,
        language,
      } = input;
      if (!userContext) {
        throw new Error('User context is required to add rules to standards');
      }

      const standardsHexa = fastify.standardsHexa();

      try {
        // Build examples array if provided
        const examples: RuleExampleInput[] = [];
        const hasPositive = (positiveExample?.length ?? 0) > 0;
        const hasNegative = (negativeExample?.length ?? 0) > 0;

        if (hasPositive || hasNegative) {
          const parsedLanguage = language?.trim()
            ? stringToProgrammingLanguage(language)
            : ProgrammingLanguage.JAVASCRIPT;

          examples.push({
            positive: extractCodeFromMarkdown(positiveExample ?? '') || '',
            negative: extractCodeFromMarkdown(negativeExample ?? '') || '',
            language: parsedLanguage,
          });
        }

        // Add rule with examples in one atomic operation
        const newStandardVersion = await standardsHexa
          .getAdapter()
          .addRuleToStandard({
            standardSlug: standardSlug.toLowerCase(),
            ruleContent,
            organizationId: createOrganizationId(userContext.organizationId),
            userId: createUserId(userContext.userId),
            examples,
          });

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `save_standard_rule` },
        );

        // For trial users, ensure the standard is added to the Default package
        let trialPackageSlug: string | null = null;
        const isTrial = await isTrialUser(
          fastify,
          createUserId(userContext.userId),
        );

        if (isTrial) {
          logger.info('Trial user detected, ensuring Default package exists', {
            userId: userContext.userId,
          });

          const globalSpace = await getGlobalSpace(
            fastify,
            createOrganizationId(userContext.organizationId),
          );

          trialPackageSlug = await ensureDefaultPackageWithArtifact(
            fastify,
            userContext,
            globalSpace.id,
            { standardId: newStandardVersion.standardId },
            logger,
          );
        }

        const baseMessage = `Rule added successfully to standard '${standardSlug.toLowerCase()}'. New version ${newStandardVersion.version} created.`;

        if (trialPackageSlug) {
          const shouldPromptActivation = await shouldPromptForTrialActivation(
            fastify,
            createUserId(userContext.userId),
          );

          const activationPrompt = shouldPromptActivation
            ? `\n\n${buildTrialActivationPrompt()}`
            : '';

          return {
            content: [
              {
                type: 'text',
                text: `${baseMessage}\n\n${buildTrialInstallPrompt(trialPackageSlug)}${activationPrompt}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: baseMessage,
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
