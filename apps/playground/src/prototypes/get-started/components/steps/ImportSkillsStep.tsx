import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCheck } from 'react-icons/lu';
import { CLI_IMPORT_ADD, CLI_IMPORT_SUBMIT } from '../../data';
import type { ImportedSkill, ProposedSkill } from '../../types';
import { CliCaption, CliCommand } from '../CliCommand';
import { Chip, Lane, LaneGrid, SkillRow, StepShell } from '../bits';

interface ImportSkillsStepProps {
  skills: ImportedSkill[];
  proposed: ProposedSkill[];
  importing: boolean;
  sampleAdded: boolean;
  onAddSample: () => void;
  onSimulateCli: () => void;
  onApprove: (id: string) => void;
}

export function ImportSkillsStep({
  skills,
  proposed,
  importing,
  sampleAdded,
  onAddSample,
  onSimulateCli,
  onApprove,
}: Readonly<ImportSkillsStepProps>) {
  return (
    <StepShell
      title="Import your skills"
      lead="You already have skills sitting in .claude/skills and friends. Pull them into Packmind so they get versioned, reviewed, and shipped to every agent. Start with a sample if you want to see the whole loop first."
    >
      <LaneGrid>
        <Lane
          title="Drop in a sample"
          hint="No terminal. Feel the whole loop in under a minute."
        >
          <PMButton
            variant="primary"
            size="sm"
            onClick={onAddSample}
            disabled={sampleAdded}
          >
            {sampleAdded ? 'Sample added' : 'Add a sample skill'}
          </PMButton>
        </Lane>

        <Lane
          title="Import your own"
          hint="Push the skills from a repo you already have open."
        >
          <PMVStack gap={2} align="stretch">
            <CliCaption>Stage a skill, then submit it for review</CliCaption>
            <CliCommand command={CLI_IMPORT_ADD} />
            <CliCommand command={CLI_IMPORT_SUBMIT} />
          </PMVStack>
          {importing ? (
            <PMHStack gap={2} color="text.tertiary">
              <PMSpinner size="sm" />
              <PMText fontSize="xs">Waiting for your push…</PMText>
            </PMHStack>
          ) : (
            <PMButton variant="outline" size="sm" onClick={onSimulateCli}>
              Simulate the push
            </PMButton>
          )}
        </Lane>
      </LaneGrid>

      {proposed.length > 0 && (
        <PMVStack
          gap={3}
          align="stretch"
          bg="background.secondary"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          padding={4}
        >
          <PMText fontSize="sm" fontWeight="medium" color="primary">
            {proposed.length} skill{proposed.length === 1 ? '' : 's'} proposed
            from the CLI
          </PMText>
          <PMText fontSize="xs" color="tertiary">
            The CLI submits imports as a change proposal. Approve to add them to
            your space.
          </PMText>
          {proposed.map((p) => (
            <SkillRow
              key={p.id}
              name={p.name}
              description={p.description}
              agent={p.agent}
              files={p.files}
              sourceChip={<Chip tone="brand">proposed</Chip>}
              trailing={
                <PMButton
                  variant="secondary"
                  size="xs"
                  onClick={() => onApprove(p.id)}
                >
                  Approve
                </PMButton>
              }
            />
          ))}
        </PMVStack>
      )}

      {skills.length > 0 && (
        <PMVStack gap={3} align="stretch">
          <PMHStack gap={2} align="center">
            <PMIcon fontSize="sm" color="text.success">
              <LuCheck />
            </PMIcon>
            <PMText fontSize="sm" color="secondary">
              {skills.length} skill{skills.length === 1 ? '' : 's'} in your
              space
            </PMText>
          </PMHStack>
          <PMVStack gap={2} align="stretch">
            {skills.map((s) => (
              <SkillRow
                key={s.id}
                name={s.name}
                description={s.description}
                agent={s.agent}
                files={s.files}
                sourceChip={
                  s.source === 'sample' ? (
                    <Chip tone="neutral">sample</Chip>
                  ) : (
                    <Chip tone="neutral">imported</Chip>
                  )
                }
              />
            ))}
          </PMVStack>
          <PMBox>
            <PMText fontSize="xs" color="faded">
              Next: bundle these into a package so you can ship them as one
              versioned unit.
            </PMText>
          </PMBox>
        </PMVStack>
      )}
    </StepShell>
  );
}
