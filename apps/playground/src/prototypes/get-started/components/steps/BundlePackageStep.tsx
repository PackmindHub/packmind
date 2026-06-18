import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCheck, LuPackage } from 'react-icons/lu';
import type { ImportedSkill } from '../../types';
import { Chip, StepShell } from '../bits';

interface BundlePackageStepProps {
  skills: ImportedSkill[];
  packageCreated: boolean;
  packageName: string;
  selectedSkillIds: string[];
  onToggleSkill: (id: string) => void;
  onNameChange: (name: string) => void;
  onCreate: () => void;
}

export function BundlePackageStep({
  skills,
  packageCreated,
  packageName,
  selectedSkillIds,
  onToggleSkill,
  onNameChange,
  onCreate,
}: Readonly<BundlePackageStepProps>) {
  if (packageCreated) {
    const count = selectedSkillIds.length;
    return (
      <StepShell
        title="Bundle them into a package"
        lead="A package is the unit you ship and version. Add or remove skills later, and every repo on it sees the change."
      >
        <PMVStack
          gap={3}
          align="stretch"
          bg="background.primary"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          padding={4}
        >
          <PMHStack gap={3} align="center">
            <PMIcon fontSize="lg" color="branding.primary">
              <LuPackage />
            </PMIcon>
            <PMVStack gap={0} align="stretch" flex={1}>
              <PMText fontSize="sm" fontWeight="medium" color="primary">
                {packageName}
              </PMText>
              <PMText fontSize="xs" color="tertiary">
                {count} skill{count === 1 ? '' : 's'} bundled
              </PMText>
            </PMVStack>
            <Chip tone="success">v1 ready</Chip>
          </PMHStack>
        </PMVStack>
        <PMText fontSize="xs" color="faded">
          Next: ship it to a repo, from the CLI or straight from the app.
        </PMText>
      </StepShell>
    );
  }

  const canCreate =
    packageName.trim().length > 0 && selectedSkillIds.length > 0;

  return (
    <StepShell
      title="Bundle them into a package"
      lead="Pick the skills to ship together and give the package a name. This is what you distribute and version."
    >
      <PMVStack gap={2} align="stretch" maxW="420px">
        <PMText fontSize="xs" fontWeight="medium" color="secondary">
          Package name
        </PMText>
        <PMInput
          value={packageName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Starter playbook"
          size="sm"
        />
      </PMVStack>

      <PMVStack gap={2} align="stretch">
        <PMText fontSize="xs" fontWeight="medium" color="secondary">
          Skills to include
        </PMText>
        {skills.map((s) => {
          const selected = selectedSkillIds.includes(s.id);
          return (
            <PMHStack
              key={s.id}
              role="checkbox"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => onToggleSkill(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleSkill(s.id);
                }
              }}
              gap={3}
              align="center"
              textAlign="left"
              bg="background.primary"
              borderWidth="1px"
              borderColor={selected ? 'branding.primary' : 'border.tertiary'}
              borderRadius="md"
              paddingY={2}
              paddingX={3}
              cursor="pointer"
              transition="border-color 150ms ease-out"
            >
              <PMBox
                width="18px"
                height="18px"
                borderRadius="sm"
                flexShrink={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={selected ? 'branding.primary' : 'transparent'}
                borderWidth={selected ? '0' : '1.5px'}
                borderColor="border.checkbox"
              >
                {selected && (
                  <PMIcon fontSize="2xs" color="background.primary">
                    <LuCheck />
                  </PMIcon>
                )}
              </PMBox>
              <PMText
                fontFamily="mono"
                fontSize="sm"
                color="primary"
                flex={1}
                truncate
              >
                {s.name}
              </PMText>
              <PMText fontSize="xs" color="faded" flexShrink={0}>
                {s.agent}
              </PMText>
            </PMHStack>
          );
        })}
      </PMVStack>

      <PMBox>
        <PMButton
          variant="primary"
          size="sm"
          onClick={onCreate}
          disabled={!canCreate}
        >
          Create package
        </PMButton>
      </PMBox>
    </StepShell>
  );
}
