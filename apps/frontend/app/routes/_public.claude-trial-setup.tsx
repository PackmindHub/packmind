import { useSearchParams } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMAlert,
  PMLink,
} from '@packmind/ui';
import { CopiableTextarea } from '../../src/shared/components/inputs';

const ONBOARDING_PROMPT =
  'Use the packmind_onboarding tool to help set up coding standards for your codebase.';

function buildClaudeMcpCommand(token: string, mcpUrl: string): string {
  return `claude mcp add --transport http packmind ${mcpUrl} --header "Authorization: Bearer ${token}"`;
}

export default function ClaudeTrialSetupRouteModule() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');
  const mcpUrl = searchParams.get('mcpUrl');

  if (!token || !mcpUrl) {
    return (
      <PMVStack gap={6} align="stretch">
        <PMBox textAlign="center">
          <PMHeading level="h2">Invalid Setup Link</PMHeading>
        </PMBox>

        <PMAlert.Root status="error" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Missing parameters</PMAlert.Title>
            <PMAlert.Description>
              This setup link is missing required parameters. Please request a
              new trial link.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      </PMVStack>
    );
  }

  const mcpCommand = buildClaudeMcpCommand(token, mcpUrl);

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Set Up Packmind for Claude</PMHeading>
        <PMText color="secondary" mt={2}>
          Follow these two steps to get started with Packmind in Claude
        </PMText>
      </PMBox>

      <PMVStack gap={8} align="stretch">
        <PMVStack gap={3} align="stretch">
          <PMText fontWeight="bold" fontSize="md">
            Step 1: Install the MCP Server
          </PMText>
          <PMText color="secondary" fontSize="sm">
            Run this command in your terminal to add Packmind to Claude:
          </PMText>
          <CopiableTextarea value={mcpCommand} readOnly rows={2} />
          <PMText color="secondary" fontSize="xs">
            Make sure you have{' '}
            <PMLink
              href="https://docs.anthropic.com/en/docs/claude-code/overview"
              variant="underline"
            >
              Claude Code CLI
            </PMLink>{' '}
            installed.
          </PMText>
        </PMVStack>

        <PMVStack gap={3} align="stretch">
          <PMText fontWeight="bold" fontSize="md">
            Step 2: Start the Onboarding
          </PMText>
          <PMText color="secondary" fontSize="sm">
            Copy this prompt and paste it in Claude to begin setting up your
            coding standards:
          </PMText>
          <CopiableTextarea value={ONBOARDING_PROMPT} readOnly rows={2} />
        </PMVStack>
      </PMVStack>
    </PMVStack>
  );
}
