import { useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMLink,
  PMNativeSelect,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCheck, LuGitCommitHorizontal } from 'react-icons/lu';
import { CLI_INSTALL, STUB_REPOS, STUB_TARGETS } from '../../data';
import type { ShipOutcome, ShipState } from '../../types';
import { CliCaption, CliCommand } from '../CliCommand';
import { Lane, LaneGrid, StepShell } from '../bits';

interface ShipToRepoStepProps {
  packageName: string;
  shipState: ShipState;
  shipOutcome: ShipOutcome;
  onOutcomeChange: (outcome: ShipOutcome) => void;
  onShipCli: () => void;
  onShipWeb: () => void;
  onRetry: () => void;
}

export function ShipToRepoStep({
  packageName,
  shipState,
  shipOutcome,
  onOutcomeChange,
  onShipCli,
  onShipWeb,
  onRetry,
}: Readonly<ShipToRepoStepProps>) {
  const [connected, setConnected] = useState(false);

  const lead =
    'Render the package into a real repo. Pick the lane that fits: run the CLI in a repo you have open, or connect a repo and publish from here. Either way it lands as a commit and reports back for governance.';

  return (
    <StepShell title="Ship it to a repo" lead={lead}>
      {/* Prototype-only outcome switch so both paths are reviewable. */}
      <PMHStack gap={2} align="center" justify="flex-end">
        <PMText fontSize="2xs" color="faded">
          Prototype: outcome
        </PMText>
        <PMNativeSelect
          items={[
            { label: 'Success', value: 'success' },
            { label: 'Failure', value: 'failure' },
          ]}
          value={shipOutcome}
          onChange={(e) => onOutcomeChange(e.target.value as ShipOutcome)}
          size="xs"
          width="120px"
        />
      </PMHStack>

      {shipState === 'pending' && (
        <PMHStack
          gap={3}
          align="center"
          bg="background.secondary"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          padding={4}
        >
          <PMSpinner size="sm" />
          <PMText fontSize="sm" color="secondary">
            Rendering {packageName} into acme/api and opening a commit…
          </PMText>
        </PMHStack>
      )}

      {shipState === 'failure' && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMBox flex={1}>
            <PMAlert.Title>Could not write to acme/api</PMAlert.Title>
            <PMAlert.Description>
              Packmind needs write access to the default branch. Check the
              connection and try again.
            </PMAlert.Description>
          </PMBox>
          <PMButton variant="secondary" size="xs" onClick={onRetry}>
            Try again
          </PMButton>
        </PMAlert.Root>
      )}

      {shipState === 'success' && (
        <PMVStack
          gap={2}
          align="stretch"
          bg="background.primary"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          padding={4}
        >
          <PMHStack gap={2} align="center">
            <PMIcon fontSize="md" color="text.success">
              <LuCheck />
            </PMIcon>
            <PMText fontSize="sm" fontWeight="medium" color="primary">
              {packageName} v1 is live in acme/api
            </PMText>
          </PMHStack>
          <PMHStack gap={2} align="center" color="text.tertiary">
            <PMIcon fontSize="sm">
              <LuGitCommitHorizontal />
            </PMIcon>
            <PMText fontSize="xs">
              Rendered to .claude/skills and .cursor/skills in commit{' '}
              <PMLink href="#" fontSize="xs">
                a1b2c3d
              </PMLink>
            </PMText>
          </PMHStack>
          <PMText fontSize="xs" color="faded">
            Next: see it tracked across every repo in Governance.
          </PMText>
        </PMVStack>
      )}

      {(shipState === 'idle' || shipState === 'failure') && (
        <LaneGrid>
          <Lane
            title="Run it locally"
            hint="For a repo you already have checked out."
          >
            <PMVStack gap={2} align="stretch">
              <CliCaption>Pull the package into the repo</CliCaption>
              <CliCommand command={CLI_INSTALL} />
            </PMVStack>
            <PMButton variant="outline" size="sm" onClick={onShipCli}>
              Simulate the install
            </PMButton>
          </Lane>

          <Lane
            title="Connect a repo"
            hint="Publish from the app, no terminal needed."
          >
            {!connected ? (
              <PMButton
                variant="secondary"
                size="sm"
                onClick={() => setConnected(true)}
              >
                Connect GitHub
              </PMButton>
            ) : (
              <PMVStack gap={2} align="stretch">
                <PMNativeSelect
                  items={STUB_REPOS}
                  defaultValue={STUB_REPOS[0].value}
                  size="sm"
                />
                <PMNativeSelect
                  items={STUB_TARGETS}
                  defaultValue={STUB_TARGETS[0].value}
                  size="sm"
                />
                <PMButton variant="primary" size="sm" onClick={onShipWeb}>
                  Publish
                </PMButton>
              </PMVStack>
            )}
          </Lane>
        </LaneGrid>
      )}
    </StepShell>
  );
}
