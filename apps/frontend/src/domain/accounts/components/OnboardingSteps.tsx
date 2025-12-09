import React from 'react';
import {
  PMAccordion,
  PMBox,
  PMButton,
  PMField,
  PMHeading,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { SetupLocalEnvironment } from './SetupLocalEnvironment';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { NavLink } from 'react-router';
import { routes } from '../../../shared/utils/routes';
import { useAuthContext } from '../hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

export const OnboardingSteps: React.FC = () => {
  const { organization } = useAuthContext();
  const { spaceSlug } = useCurrentSpace();

  const orgSlug = organization?.slug || '';
  const currentSpaceSlug = spaceSlug || '';

  return (
    <PMBox>
      <PMAccordion.Root defaultValue={['step-1']}>
        <PMAccordion.Item value="step-1">
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            Configure your local environment
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent>
            <PMVStack align="flex-start" paddingBottom={6}>
              <SetupLocalEnvironment />
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>

        <PMAccordion.Item value="step-2">
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            Build your playbook
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent>
            <PMVStack align="flex-start" paddingBottom={6} gap={4}>
              <PMText as="p">
                Create standards and recipes tailored to your project context.
                With configured MCP server, use this prompt with your AI coding
                agent:
              </PMText>

              <PMField.Root width="full">
                <PMField.Label>
                  Bootstrap with on-boarding MCP tool
                </PMField.Label>
                <CopiableTextarea
                  value="Run the Packmind on-boarding process"
                  readOnly
                  rows={1}
                  width="full"
                />
              </PMField.Root>

              <PMHeading level="h6" marginTop={4}>
                As you code
              </PMHeading>

              <PMText as="p">
                You can contribute to the playbook anytime as you code. Here are
                a few examples:
              </PMText>

              <PMField.Root width="full">
                <PMField.Label>New standard</PMField.Label>
                <CopiableTextarea
                  value="Generate a Packmind Standard describing our error handling in Node.js APIs."
                  readOnly
                  rows={2}
                  width="full"
                />
              </PMField.Root>

              <PMField.Root width="full">
                <PMField.Label>New recipe</PMField.Label>
                <CopiableTextarea
                  value="From the last commit, create a Packmind Recipe to refactor a React component to use Hooks instead of class components."
                  readOnly
                  rows={2}
                  width="full"
                />
              </PMField.Root>

              <PMField.Root width="full">
                <PMField.Label>Add a rule to standard</PMField.Label>
                <CopiableTextarea
                  value="Add a rule to enforce usage of the Button component instead of plain html buttons in the standard about our design system"
                  readOnly
                  rows={2}
                  width="full"
                />
              </PMField.Root>
            </PMVStack>
          </PMAccordion.ItemContent>
        </PMAccordion.Item>

        <PMAccordion.Item value="step-3">
          <PMAccordion.ItemTrigger cursor="pointer">
            <PMAccordion.ItemIndicator />
            Vibe code with confidence
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent>
            <PMVStack align="flex-start" paddingBottom={6} gap={4}>
              <PMHeading level="h6">Create packages</PMHeading>

              <PMText as="p">
                Standards and recipes must be bundled into packages to be
                distributed in your projects
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
                Configure which ones you use
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
                Renders playbook as prompts for your AI agent using the CLI
              </PMText>

              <PMField.Root width="full">
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
