import {
  PMAccordion,
  PMBox,
  PMHeading,
  PMImage,
  PMLink,
  PMList,
  PMPageSection,
  PMSeparator,
  PMText,
  PMTextArea,
  PMVStack,
  PMField,
  PMAlert,
} from '@packmind/ui';
import { ReactNode } from 'react';
import { GettingStartedLearnMoreDialog } from './GettingStartedLearnMoreDialog';
import { McpConfig } from '../../../accounts/components/McpConfig';
import {
  createRecipe,
  distributeCodingStandards,
  enforceCodingStandsards,
} from '@packmind/assets';
import { NavLink } from 'react-router';

type GettingStartedDialog = {
  title?: string;
  body: ReactNode;
};

export type GettingStartedWidgetProps = {
  dialogs?: {
    create?: GettingStartedDialog;
    deploy?: GettingStartedDialog;
    use?: GettingStartedDialog;
  };
};

const DEFAULT_DIALOGS: Required<
  NonNullable<GettingStartedWidgetProps['dialogs']>
> = {
  create: {
    body: (
      <PMVStack gap={10} align="stretch">
        <PMBox>
          <PMImage src={createRecipe} mb={4} />
          <PMText color="tertiary">
            Connect your MCP server to capture standards and recipes directly
            from your coding assistant.
          </PMText>
        </PMBox>

        <PMSeparator borderColor={'border.tertiary'} />

        <PMVStack align="stretch" gap={6}>
          <PMHeading level="h3" textAlign={'center'}>
            1. Configure your MCP server
          </PMHeading>
          <PMText color="secondary">
            The MCP server lets AI coding assistants communicate with Packmind
            to create and consume data.
          </PMText>

          <McpConfig />
        </PMVStack>

        <PMSeparator borderColor={'border.tertiary'} />

        <PMVStack align="stretch" gap={6}>
          <PMHeading level="h3" textAlign={'center'}>
            2. Prompt your coding assistant
          </PMHeading>
          <PMText color="secondary">
            Use prompts in your coding assistant to create standards and
            recipes.
          </PMText>
          <PMField.Root>
            <PMField.Label>
              Example: create a standard about error handling
            </PMField.Label>
            <PMTextArea
              value="Generate a Packmind Standard describing our error handling in Node.js APIs."
              readOnly
              resize={'none'}
            />
          </PMField.Root>

          <PMField.Root>
            <PMField.Label>
              Example: create a recipe to refactor a React component
            </PMField.Label>

            <PMTextArea
              value="From the last commit, create a Packmind Recipe to refactor a React component to use hooks instead of class components."
              readOnly
              resize={'none'}
            />
          </PMField.Root>

          <PMAlert.Root status="info">
            <PMAlert.Indicator />
            <PMAlert.Content>
              You can also create and edit standards from the Standards page.
            </PMAlert.Content>
          </PMAlert.Root>
        </PMVStack>
      </PMVStack>
    ),
  },
  deploy: {
    body: (
      <PMVStack gap={10} align="stretch">
        <PMBox>
          <PMImage src={distributeCodingStandards} mb={4} />
          <PMText color="tertiary">
            Distribute standards and recipes to Git repositories. They are
            published as Markdown in target repositories, making them easy to
            use by AI coding agents and developers.
          </PMText>
        </PMBox>
        <PMSeparator borderColor={'border.tertiary'} />
        <PMVStack align="stretch" gap={6} padding={4}>
          <PMHeading level="h3" textAlign={'center'}>
            1. Connect your Git repositories
          </PMHeading>

          <PMList.Root>
            <PMList.Item>
              <PMText variant="body-important" marginRight={1}>
                Connect your Git provider
              </PMText>
              <PMText color="secondary" marginRight={1}>
                Go to Settings →
                <PMLink asChild variant="active" marginLeft={1}>
                  <NavLink to="./settings/git" target="_blank">
                    Git
                  </NavLink>
                </PMLink>
              </PMText>
            </PMList.Item>
            <PMList.Item>
              <PMText variant="body-important" marginRight={1}>
                Add repositories
              </PMText>
              <PMText color="secondary">
                After authorizing your Git provider, select the repositories to
                connect.
              </PMText>
            </PMList.Item>
          </PMList.Root>
        </PMVStack>
        <PMSeparator borderColor={'border.tertiary'} />
        <PMVStack align="stretch" gap={6} padding={4}>
          <PMHeading level="h3" textAlign={'center'}>
            2. Deploy to your targets
          </PMHeading>

          <PMList.Root>
            <PMList.Item>
              <PMText variant="body-important" marginRight={1}>
                Deploy standards and recipes
              </PMText>

              <PMText color="secondary">
                From the Recipes or Standards page, select the artifacts you
                want to deploy and click Deploy. Each connected repository
                appears as a target.
              </PMText>
            </PMList.Item>

            <PMList.Item>
              <PMText variant="body-important" marginRight={1}>
                You're done!
              </PMText>

              <PMText color="secondary">
                Each connected repository has a default target at the repository
                root ('/'). Standards and recipes are created in a .packmind
                directory.
              </PMText>
            </PMList.Item>
          </PMList.Root>
        </PMVStack>
        <PMSeparator borderColor={'border.tertiary'} />
        <PMVStack align="stretch" gap={6} padding={4}>
          <PMHeading level="h3" textAlign={'center'}>
            Optional: Work with monorepos
          </PMHeading>

          <PMText color="secondary">
            In monorepos, distribute standards and recipes only to relevant apps
            and packages by creating additional targets for specific
            directories.
          </PMText>

          <PMList.Root>
            <PMList.Item>
              <PMText variant="body-important" marginRight={1}>
                Define a target
              </PMText>

              <PMText color="secondary">
                Go to
                <PMLink asChild variant="active" marginX={1}>
                  <NavLink to="./settings/targets" target="_blank">
                    Targets
                  </NavLink>
                </PMLink>
                to manage targets for each connected repository.
              </PMText>
            </PMList.Item>
            <PMList.Item>
              <PMText variant="body-important" marginRight={1}>
                Distribute to a target
              </PMText>

              <PMText color="secondary">
                When deploying from the Standards or Recipes page, select your
                new target just like the default one.
              </PMText>
            </PMList.Item>
          </PMList.Root>
        </PMVStack>
        <PMSeparator borderColor={'border.tertiary'} />
      </PMVStack>
    ),
  },
  use: {
    body: (
      <PMVStack gap={10} align="stretch">
        <PMBox>
          <PMImage src={enforceCodingStandsards} mb={4} />
          <PMText color="tertiary">
            Use and enrich your coding standards as you code
          </PMText>
        </PMBox>

        <PMSeparator borderColor={'border.tertiary'} />
        <PMVStack align="stretch" gap={6} padding={4}>
          <PMHeading level="h3" textAlign={'center'}>
            Usage with your coding assistant
          </PMHeading>

          <PMText color="secondary">
            During the "Deployment" action, Packmind also update config files
            for most popular coding assistant (Github Copilot, Claude,
            Cursor...) so they are natively aware of your standards and recipes.
          </PMText>

          <PMText color="secondary">
            Since context windows are limited, coding assistants may "forget"
            about your coding standards along the way. In this case, do not
            hesitate to mention the Markdown files stored in the configuration
            folder of your agent (.cursor/rules etc.)
          </PMText>
        </PMVStack>

        <PMSeparator borderColor={'border.tertiary'} />
        <PMVStack align="stretch" gap={6} padding={4}>
          <PMHeading level="h3" textAlign={'center'}>
            Enrich your standards as you code
          </PMHeading>

          <PMText color="secondary">
            As you code, it is not uncommon to find new best practices or edge
            cases that your current standards do not cover. You can easily
            update your standards by prompting your coding assistant with the
            new information:
          </PMText>
          <PMField.Root>
            <PMField.Label>Example: add a rule to a standard</PMField.Label>
            <PMTextArea
              readOnly
              resize={'none'}
              value={
                'Add a rule to our Packmind standard about testing to forbid usage of "should" in test names'
              }
            />
          </PMField.Root>
        </PMVStack>
      </PMVStack>
    ),
  },
};

// Export public constant to reuse the same "create" dialog content elsewhere (e.g., Standards empty state)
export const GETTING_STARTED_CREATE_DIALOG = DEFAULT_DIALOGS.create;

export const GettingStartedWidget: React.FC<GettingStartedWidgetProps> = ({
  dialogs,
}) => (
  <PMPageSection
    title="🚀 Getting started"
    headingLevel="h5"
    backgroundColor="primary"
  >
    <PMAccordion.Root defaultValue={['getting-started-1']}>
      <PMAccordion.Item value="getting-started-1">
        <PMAccordion.ItemTrigger cursor={'pointer'}>
          <PMAccordion.ItemIndicator />
          Create standards and recipes
        </PMAccordion.ItemTrigger>
        <PMAccordion.ItemContent>
          <PMVStack align="flex-start" paddingBottom={6}>
            <PMText color="secondary">
              Set up your MCP server to capture standards and recipes from your
              coding assistant.
            </PMText>
            <GettingStartedLearnMoreDialog
              title={(dialogs?.create ?? DEFAULT_DIALOGS.create).title}
              body={(dialogs?.create ?? DEFAULT_DIALOGS.create).body}
              buttonSize="xs"
            />
          </PMVStack>
        </PMAccordion.ItemContent>
      </PMAccordion.Item>

      <PMAccordion.Item value="getting-started-2">
        <PMAccordion.ItemTrigger cursor={'pointer'}>
          <PMAccordion.ItemIndicator />
          Distribute standards and recipes
        </PMAccordion.ItemTrigger>
        <PMAccordion.ItemContent>
          <PMVStack align="flex-start" paddingBottom={6}>
            <PMText color="secondary">
              Distribute standards and recipes to your targets (Git
              repositories, directories).
            </PMText>
            <GettingStartedLearnMoreDialog
              title={(dialogs?.deploy ?? DEFAULT_DIALOGS.deploy).title}
              body={(dialogs?.deploy ?? DEFAULT_DIALOGS.deploy).body}
              buttonSize="xs"
            />
          </PMVStack>
        </PMAccordion.ItemContent>
      </PMAccordion.Item>

      <PMAccordion.Item value="getting-started-3">
        <PMAccordion.ItemTrigger cursor={'pointer'}>
          <PMAccordion.ItemIndicator />
          Leverage your code standards and recipes
        </PMAccordion.ItemTrigger>
        <PMAccordion.ItemContent>
          <PMVStack align="flex-start" paddingBottom={6}>
            <PMText color="secondary">
              Enforce adoption of your coding practices
            </PMText>
            <GettingStartedLearnMoreDialog
              title={(dialogs?.use ?? DEFAULT_DIALOGS.use).title}
              body={(dialogs?.use ?? DEFAULT_DIALOGS.use).body}
              buttonSize="xs"
            />
          </PMVStack>
        </PMAccordion.ItemContent>
      </PMAccordion.Item>
    </PMAccordion.Root>
  </PMPageSection>
);
