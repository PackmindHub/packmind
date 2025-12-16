import React from 'react';
import {
  PMAccordion,
  PMBox,
  PMButton,
  PMField,
  PMHeading,
  PMLink,
  PMTabs,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { SetupLocalEnvironment } from './SetupLocalEnvironment';
import { CliAuthentication } from './CliAuthentication';
import { McpConfigRedesigned } from './McpConfig/McpConfigRedesigned';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { NavLink } from 'react-router';
import { routes } from '../../../shared/utils/routes';
import { useAuthContext } from '../hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

export const OnboardingSteps: React.FC = () => {
  const { organization } = useAuthContext();
  const { spaceSlug } = useCurrentSpace();

  const orgSlug = organization?.slug || '';
  const currentSpaceSlug = spaceSlug || 'global';

  return (
    <PMBox>
      <PMAccordion.Root defaultValue={['step-1']}>
        <PMAccordion.Item
          value="step-1"
          backgroundColor={'background.primary'}
          p={2}
        >
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            <PMHeading level="h4">
              ⚙️ Configure your local environment
            </PMHeading>
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={2}>
            <PMVStack align="flex-start" paddingBottom={6}>
              <PMTabs
                defaultValue="automatic"
                width="full"
                tabs={[
                  {
                    value: 'automatic',
                    triggerLabel: 'Automatic',
                    content: (
                      <PMVStack align="flex-start" gap={4} paddingTop={4}>
                        <SetupLocalEnvironment />
                      </PMVStack>
                    ),
                  },
                  {
                    value: 'manual',
                    triggerLabel: 'Manual',
                    content: (
                      <PMVStack align="flex-start" gap={6} paddingTop={4}>
                        <PMBox width="full">
                          <PMHeading level="h5" marginBottom={4}>
                            CLI
                          </PMHeading>
                          <PMText as="p" marginBottom={4}>
                            Learn how to install the CLI:{' '}
                            <PMLink
                              href="https://docs.packmind.com/cli#installation"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Installation guide
                            </PMLink>
                          </PMText>
                          <CliAuthentication />
                        </PMBox>
                        <PMBox width="full">
                          <PMHeading level="h5" marginBottom={4}>
                            MCP server configuration
                          </PMHeading>
                          <McpConfigRedesigned />
                        </PMBox>
                      </PMVStack>
                    ),
                  },
                ]}
              />
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>

        <PMAccordion.Item
          value="step-2"
          backgroundColor={'background.primary'}
          mt={4}
          p={2}
        >
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            <PMHeading level="h4">🤖 Build your playbook</PMHeading>
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={2}>
            <PMVStack align="flex-start" paddingBottom={6} gap={4}>
              <PMText as="p">
                Create standards and recipes tailored to your project context.
                With configured MCP server, use this prompt with your AI coding
                agent:
              </PMText>

              <PMTabs
                defaultValue="quick-start"
                width="full"
                tabs={[
                  {
                    value: 'quick-start',
                    triggerLabel: 'Getting Started',
                    content: (
                      <PMVStack align="flex-start" gap={4} paddingTop={4}>
                        <PMField.Root width="full">
                          <PMField.Label>
                            Prompt: Bootstrap with on-boarding MCP tool
                          </PMField.Label>
                          <CopiableTextarea
                            value="Run the Packmind on-boarding process"
                            readOnly
                            rows={1}
                            width="full"
                          />
                        </PMField.Root>
                      </PMVStack>
                    ),
                  },
                  {
                    value: 'examples',
                    triggerLabel: 'Advanced',
                    content: (
                      <PMVStack align="flex-start" gap={4} paddingTop={4}>
                        <PMText as="p">
                          You can contribute to the playbook anytime as you
                          code. Here are a few examples:
                        </PMText>

                        <PMField.Root width="full">
                          <PMField.Label>
                            Prompt: create new standard
                          </PMField.Label>
                          <CopiableTextarea
                            value="Generate a Packmind Standard describing our error handling in Node.js APIs."
                            readOnly
                            rows={2}
                            width="full"
                          />
                        </PMField.Root>

                        <PMField.Root width="full">
                          <PMField.Label>
                            Prompt: create new recipe
                          </PMField.Label>
                          <CopiableTextarea
                            value="From the last commit, create a Packmind Recipe to refactor a React component to use Hooks instead of class components."
                            readOnly
                            rows={2}
                            width="full"
                          />
                        </PMField.Root>

                        <PMField.Root width="full">
                          <PMField.Label>
                            Prompt: add rule to standard
                          </PMField.Label>
                          <CopiableTextarea
                            value="Add a rule to enforce usage of the Button component instead of plain html buttons in the standard about our design system"
                            readOnly
                            rows={2}
                            width="full"
                          />
                        </PMField.Root>
                      </PMVStack>
                    ),
                  },
                ]}
              />
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>

        <PMAccordion.Item
          value="step-3"
          backgroundColor={'background.primary'}
          mt={4}
          p={2}
        >
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            <PMHeading level="h4">🚀 Vibe code with confidence</PMHeading>
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent p={2}>
            <PMVStack align="flex-start" paddingBottom={6} gap={4}>
              <PMHeading level="h6">Create packages</PMHeading>

              <PMText as="p">
                Standards and recipes must be bundled into packages to be
                distributed in your projects.
              </PMText>

              <NavLink
                to={routes.space.toCreatePackage(orgSlug, currentSpaceSlug)}
              >
                <PMButton variant="primary" size="sm">
                  Create package
                </PMButton>
              </NavLink>

              <PMHeading level="h6" marginTop={4}>
                Configure the target AI agents
              </PMHeading>

              <PMText as="p">
                Packmind works with most of the AI agents of the market.
                Configure which ones you use.
              </PMText>

              <NavLink to={routes.org.toSettingsDistribution(orgSlug)}>
                <PMButton variant="primary" size="sm">
                  Configure rendering
                </PMButton>
              </NavLink>

              <PMHeading level="h6" marginTop={4}>
                Distribute playbook
              </PMHeading>

              <PMText as="p">
                Renders playbook as prompts for your AI agent using the CLI.
              </PMText>

              <PMField.Root width="full">
                <PMField.Label>Bash</PMField.Label>
                <CopiableTextarea
                  value="packmind-cli install <package-name>"
                  readOnly
                  rows={1}
                  width="full"
                />
              </PMField.Root>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>
      </PMAccordion.Root>
    </PMBox>
  );
};
