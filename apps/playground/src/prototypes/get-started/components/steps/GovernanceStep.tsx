import { useState } from 'react';
import {
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuArrowRight, LuCheck } from 'react-icons/lu';
import type { ActivityEntry, GovernanceRepoRow } from '../../types';
import { Chip, Initials, StepShell } from '../bits';

interface GovernanceStepProps {
  shipped: boolean;
  governanceFlag: boolean;
  rows: GovernanceRepoRow[];
  activity: ActivityEntry[];
}

export function GovernanceStep({
  shipped,
  governanceFlag,
  rows,
  activity,
}: Readonly<GovernanceStepProps>) {
  if (!shipped) {
    return (
      <StepShell
        title="Watch it land in Governance"
        lead="This is the payoff. Once your first repo is on the playbook, Governance shows who is on which version and where adoption stalls."
      >
        <PMVStack
          gap={3}
          align="stretch"
          bg="background.secondary"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          padding={6}
        >
          <PMText fontSize="sm" color="secondary">
            Governance lights up after your first ship. Finish the step above
            and this fills with real rows: each repo, its version, and its
            agents.
          </PMText>
          <PMVStack gap={2} align="stretch" opacity={0.4} aria-hidden>
            <GovRow
              row={{
                id: 'preview',
                repo: 'acme/api',
                packageName: 'Starter playbook',
                version: 1,
                behind: 0,
                agents: ['Claude Code'],
                lastInstall: '—',
              }}
            />
          </PMVStack>
        </PMVStack>
      </StepShell>
    );
  }

  return (
    <StepShell
      title={
        governanceFlag
          ? 'Your playbook is live and tracked'
          : 'Your playbook is live'
      }
      lead={
        governanceFlag
          ? 'Every repo on the package shows up here with its version and agents. This is the view that answers "who is on which version?".'
          : 'Governance is rolling out to every team. Until it reaches yours, track the same adoption from your space distributions.'
      }
    >
      <PMVStack gap={2} align="stretch">
        <PMText fontSize="xs" fontWeight="medium" color="secondary">
          {governanceFlag ? 'Repositories on the playbook' : 'Distributions'}
        </PMText>
        {rows.map((row) => (
          <GovRow key={row.id} row={row} />
        ))}
      </PMVStack>

      {governanceFlag && (
        <PMVStack gap={3} align="stretch">
          <PMText fontSize="xs" fontWeight="medium" color="secondary">
            Recent activity
          </PMText>
          {activity.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </PMVStack>
      )}

      <InviteTeam />
    </StepShell>
  );
}

function GovRow({ row }: Readonly<{ row: GovernanceRepoRow }>) {
  const aligned = row.behind === 0;
  return (
    <PMHStack
      gap={3}
      align="center"
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      paddingY={2}
      paddingX={3}
    >
      <PMVStack gap={0} align="stretch" flex={1} minW={0}>
        <PMText fontSize="sm" color="primary" truncate>
          {row.repo}
        </PMText>
        <PMText fontSize="xs" color="faded" truncate>
          {row.packageName} · {row.lastInstall}
        </PMText>
      </PMVStack>
      <PMHStack gap={1} flexShrink={0}>
        {row.agents.map((a) => (
          <Chip key={a} tone="neutral">
            {a}
          </Chip>
        ))}
      </PMHStack>
      {aligned ? (
        <Chip tone="success">On v{row.version}</Chip>
      ) : (
        <Chip tone="warn">
          {row.behind} version{row.behind === 1 ? '' : 's'} behind
        </Chip>
      )}
    </PMHStack>
  );
}

function ActivityRow({ entry }: Readonly<{ entry: ActivityEntry }>) {
  return (
    <PMHStack gap={3} align="center" paddingX={1}>
      <Initials
        initials={entry.initials}
        tone={entry.actor === 'You' ? 'brand' : 'neutral'}
      />
      <PMText fontSize="sm" color="secondary" flex={1} minW={0}>
        <PMText as="span" color="primary" fontWeight="medium">
          {entry.actor}
        </PMText>{' '}
        {entry.action} {entry.target}
      </PMText>
      <PMText fontSize="xs" color="faded" flexShrink={0}>
        {entry.when}
      </PMText>
    </PMHStack>
  );
}

function InviteTeam() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <PMVStack
      gap={3}
      align="stretch"
      borderTopWidth="1px"
      borderColor="border.tertiary"
      paddingTop={5}
    >
      <PMVStack gap={1} align="stretch">
        <PMText fontSize="sm" fontWeight="medium" color="primary">
          Bring your team in
        </PMText>
        <PMText fontSize="xs" color="tertiary">
          Governance is a team view. Invite the people who own these repos.
        </PMText>
      </PMVStack>
      {sent ? (
        <PMHStack gap={2} color="text.success">
          <PMIcon fontSize="sm">
            <LuCheck />
          </PMIcon>
          <PMText fontSize="sm">Invite sent to {email}.</PMText>
        </PMHStack>
      ) : (
        <PMHStack gap={2} align="center" maxW="460px">
          <PMInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@acme.com"
            size="sm"
          />
          <PMButton
            variant="secondary"
            size="sm"
            onClick={() => email.trim() && setSent(true)}
            disabled={!email.trim()}
          >
            <PMHStack gap={1}>
              Send invite
              <PMIcon fontSize="sm">
                <LuArrowRight />
              </PMIcon>
            </PMHStack>
          </PMButton>
        </PMHStack>
      )}
    </PMVStack>
  );
}
