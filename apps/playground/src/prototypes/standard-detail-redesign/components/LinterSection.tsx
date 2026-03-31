import { useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowLeft,
  LuChevronDown,
  LuChevronRight,
  LuCircleCheck,
  LuCircleX,
  LuCode,
  LuCopy,
  LuFlaskConical,
  LuLoader,
  LuPlay,
  LuPlus,
  LuShield,
  LuShieldAlert,
  LuShieldCheck,
  LuTerminal,
  LuZap,
} from 'react-icons/lu';
import {
  DetectionProgram,
  LanguageLinterConfig,
  LinterStatus,
  MockRule,
} from '../types';
import { CodeExampleBlock } from './CodeExampleBlock';

type LinterSectionProps = {
  rule: MockRule;
};

/* ─── Status helpers ─── */

const STATUS_ICON: Record<LinterStatus, typeof LuShield> = {
  active: LuShieldCheck,
  draft: LuShieldAlert,
  'not-configured': LuShield,
};
const STATUS_COLOR: Record<LinterStatus, string> = {
  active: 'green.400',
  draft: 'yellow.400',
  'not-configured': 'gray.500',
};
const STATUS_LABEL: Record<LinterStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  'not-configured': 'Not configured',
};
const STATUS_PALETTE: Record<LinterStatus, string> = {
  active: 'green',
  draft: 'yellow',
  'not-configured': 'gray',
};

/* ─── Collapsible section ─── */

function CollapsibleSection({
  title,
  icon,
  badge,
  badgePalette,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  badgePalette?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <PMBox
      borderRadius="md"
      border="1px solid"
      borderColor="border.tertiary"
      overflow="hidden"
    >
      <PMBox
        as="button"
        onClick={() => setOpen(!open)}
        display="flex"
        alignItems="center"
        gap={2}
        padding={3}
        width="full"
        cursor="pointer"
        background="none"
        border="none"
        textAlign="left"
        _hover={{ backgroundColor: 'background.secondary' }}
        transition="background-color 0.15s"
      >
        <PMBox color="secondary" flexShrink={0}>
          {icon}
        </PMBox>
        <PMText fontSize="sm" fontWeight="medium" flex={1}>
          {title}
        </PMText>
        {badge && (
          <PMBadge variant="surface" size="xs" colorPalette={badgePalette}>
            {badge}
          </PMBadge>
        )}
        <PMBox color="secondary" flexShrink={0}>
          {open ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        </PMBox>
      </PMBox>

      {open && (
        <PMBox
          padding={3}
          paddingTop={0}
          borderTop="1px solid"
          borderColor="border.tertiary"
        >
          <PMBox paddingTop={3}>{children}</PMBox>
        </PMBox>
      )}
    </PMBox>
  );
}

/* ─── Step indicator ─── */

function StepIndicator({
  completed,
  failed,
}: {
  completed: boolean;
  failed?: boolean;
}) {
  if (failed) {
    return (
      <PMBox color="red.400" flexShrink={0}>
        <LuCircleX size={16} />
      </PMBox>
    );
  }
  if (completed) {
    return (
      <PMBox color="green.400" flexShrink={0}>
        <LuCircleCheck size={16} />
      </PMBox>
    );
  }
  return (
    <PMBox color="secondary" flexShrink={0} opacity={0.4}>
      <LuLoader size={16} />
    </PMBox>
  );
}

/* ─── Program card (used inside detection program section) ─── */

function ProgramCard({
  program,
  label,
  isActive,
}: {
  program: DetectionProgram;
  label: string;
  isActive: boolean;
}) {
  const isFailed = program.status === 'draft-fail';
  const isDraft = !isActive;

  return (
    <PMBox
      padding={3}
      borderRadius="md"
      border="1px solid"
      borderColor={
        isActive ? 'green.800' : isFailed ? 'red.800' : 'border.tertiary'
      }
    >
      <PMVStack gap={3} align="stretch">
        <PMHStack gap={2} align="center" justify="space-between">
          <PMText fontSize="sm" fontWeight="medium">
            {label}
          </PMText>
          <PMBadge
            variant="surface"
            size="xs"
            colorPalette={isActive ? 'green' : isFailed ? 'red' : 'yellow'}
          >
            {isActive ? 'Active' : isFailed ? 'Draft: Fail' : 'Draft: OK'}
          </PMBadge>
        </PMHStack>

        <PMVStack gap={1.5} align="stretch">
          <PMHStack gap={2} align="center">
            <StepIndicator
              completed={program.canBeDetected}
              failed={isFailed && !program.canBeDetected}
            />
            <PMText fontSize="xs" color="secondary">
              The rule can be detected
            </PMText>
          </PMHStack>
          <PMHStack gap={2} align="center">
            <StepIndicator completed={program.programGenerated} />
            <PMText fontSize="xs" color="secondary">
              Program has been generated
            </PMText>
            {program.programGenerated && (
              <PMHStack gap={1}>
                <PMButton variant="ghost" size="xs" padding={1}>
                  Show log
                </PMButton>
                <PMButton variant="ghost" size="xs" padding={1}>
                  Show program
                </PMButton>
              </PMHStack>
            )}
          </PMHStack>
          <PMHStack gap={2} align="center">
            <StepIndicator completed={program.readyToUse} failed={isFailed} />
            <PMText fontSize="xs" color="secondary">
              Ready to use
            </PMText>
          </PMHStack>
        </PMVStack>

        <PMHStack gap={2}>
          <PMButton variant="outline" size="xs">
            <LuPlay size={12} />
            {isDraft ? 'Test draft' : 'Test program'}
          </PMButton>
          {isDraft && program.readyToUse && (
            <PMButton variant="solid" size="xs" colorPalette="green">
              <LuZap size={12} />
              Set as active
            </PMButton>
          )}
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

/* ─── Screen 1: Language list ─── */

function LanguageListRow({
  config,
  onClick,
}: {
  config: LanguageLinterConfig;
  onClick: () => void;
}) {
  const Icon = STATUS_ICON[config.linterStatus];
  const color = STATUS_COLOR[config.linterStatus];

  const summary = buildLanguageSummary(config);

  return (
    <PMBox
      as="button"
      onClick={onClick}
      display="flex"
      alignItems="center"
      gap={3}
      padding={3}
      borderRadius="md"
      border="1px solid"
      borderColor="border.tertiary"
      cursor="pointer"
      width="full"
      textAlign="left"
      background="none"
      _hover={{ backgroundColor: 'background.secondary' }}
      transition="background-color 0.15s"
    >
      <PMBox color={color} flexShrink={0}>
        <Icon size={18} />
      </PMBox>
      <PMVStack flex={1} minWidth={0} gap={0.5} align="stretch">
        <PMText fontSize="sm" fontWeight="medium">
          {config.language}
        </PMText>
        <PMText fontSize="xs" color="secondary">
          {summary}
        </PMText>
      </PMVStack>
      <PMBadge
        variant="surface"
        size="xs"
        colorPalette={STATUS_PALETTE[config.linterStatus]}
      >
        {STATUS_LABEL[config.linterStatus]}
      </PMBadge>
      <PMBox color="secondary" flexShrink={0}>
        <LuChevronRight size={14} />
      </PMBox>
    </PMBox>
  );
}

function buildLanguageSummary(config: LanguageLinterConfig): string {
  const parts: string[] = [];
  parts.push(
    `${config.codeExamples.length} example${config.codeExamples.length !== 1 ? 's' : ''}`,
  );
  if (config.activeProgram) {
    parts.push('program active');
  } else if (config.draftProgram) {
    const draftLabel =
      config.draftProgram.status === 'draft-fail'
        ? 'draft failed'
        : 'draft ready';
    parts.push(draftLabel);
  }
  return parts.join(' · ');
}

function LanguageListView({
  configs,
  onSelectLanguage,
}: {
  configs: LanguageLinterConfig[];
  onSelectLanguage: (index: number) => void;
}) {
  if (configs.length === 0) {
    return (
      <PMVStack
        gap={3}
        align="center"
        padding={6}
        borderRadius="md"
        border="1px dashed"
        borderColor="border.tertiary"
      >
        <PMText fontSize="sm" color="secondary">
          No languages configured yet
        </PMText>
        <PMButton variant="outline" size="sm">
          <LuPlus size={14} />
          Add language
        </PMButton>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={2} align="stretch">
      {configs.map((config, index) => (
        <LanguageListRow
          key={config.language}
          config={config}
          onClick={() => onSelectLanguage(index)}
        />
      ))}
      <PMButton variant="ghost" size="sm" alignSelf="flex-start">
        <LuPlus size={14} />
        Add language
      </PMButton>
    </PMVStack>
  );
}

/* ─── Screen 2: Language detail ─── */

function LanguageDetailView({
  config,
  onBack,
}: {
  config: LanguageLinterConfig;
  onBack: () => void;
}) {
  const hasExamples = config.codeExamples.length > 0;
  const isSuccess = config.detectability === 'success';
  const isFail = config.detectability === 'fail';

  const detectabilityBadge = isSuccess
    ? 'Success'
    : isFail
      ? 'Fail'
      : 'Pending';
  const detectabilityPalette = isSuccess ? 'green' : isFail ? 'red' : 'gray';

  const programBadge = config.activeProgram
    ? 'Active'
    : config.draftProgram
      ? config.draftProgram.status === 'draft-fail'
        ? 'Failed'
        : 'Draft ready'
      : 'None';
  const programPalette = config.activeProgram
    ? 'green'
    : config.draftProgram
      ? config.draftProgram.status === 'draft-fail'
        ? 'red'
        : 'yellow'
      : 'gray';

  return (
    <PMVStack gap={4} align="stretch">
      {/* Back + language header */}
      <PMHStack gap={2} align="center">
        <PMBox
          as="button"
          onClick={onBack}
          display="flex"
          alignItems="center"
          justifyContent="center"
          padding={1}
          borderRadius="sm"
          cursor="pointer"
          background="none"
          border="none"
          color="secondary"
          _hover={{ color: 'primary', backgroundColor: 'background.secondary' }}
          transition="all 0.15s"
        >
          <LuArrowLeft size={16} />
        </PMBox>
        <PMText fontSize="sm" fontWeight="semibold" flex={1}>
          {config.language}
        </PMText>
        <PMBadge
          variant="surface"
          size="xs"
          colorPalette={STATUS_PALETTE[config.linterStatus]}
        >
          {STATUS_LABEL[config.linterStatus]}
        </PMBadge>
      </PMHStack>

      <PMSeparator borderColor="border.tertiary" />

      {/* 1. Code examples */}
      <CollapsibleSection
        title={`Code examples (${config.codeExamples.length})`}
        icon={<LuCode size={16} />}
        badge={hasExamples ? `${config.codeExamples.length}` : 'None'}
        badgePalette={hasExamples ? 'blue' : 'gray'}
      >
        <PMVStack gap={3} align="stretch">
          {hasExamples ? (
            <>
              {config.codeExamples.map((example) => (
                <CodeExampleBlock key={example.id} example={example} />
              ))}
              <PMButton variant="ghost" size="xs" alignSelf="flex-start">
                <LuPlus size={14} />
                Add example
              </PMButton>
            </>
          ) : (
            <PMVStack
              gap={2}
              align="center"
              padding={5}
              borderRadius="md"
              border="1px dashed"
              borderColor="border.tertiary"
            >
              <PMText fontSize="sm" color="secondary">
                Add code examples to enable detection
              </PMText>
              <PMButton variant="outline" size="xs">
                <LuPlus size={14} />
                Add first example
              </PMButton>
            </PMVStack>
          )}
        </PMVStack>
      </CollapsibleSection>

      {/* 2. Detectability */}
      {hasExamples && (
        <CollapsibleSection
          title="Detectability"
          icon={<LuFlaskConical size={16} />}
          badge={detectabilityBadge}
          badgePalette={detectabilityPalette}
        >
          <PMVStack gap={3} align="stretch">
            <PMText fontSize="xs" color="secondary">
              {isSuccess
                ? 'The rule can be reliably detected in code.'
                : isFail
                  ? 'Detection is not reliable with the current examples. Try adding more or improving them.'
                  : 'Detectability has not been evaluated yet.'}
            </PMText>
          </PMVStack>
        </CollapsibleSection>
      )}

      {/* 3. Detection program */}
      {hasExamples && (
        <CollapsibleSection
          title="Detection program"
          icon={<LuShield size={16} />}
          badge={programBadge}
          badgePalette={programPalette}
        >
          <PMVStack gap={3} align="stretch">
            {config.activeProgram && (
              <ProgramCard
                program={config.activeProgram}
                label="Active program"
                isActive
              />
            )}

            {config.draftProgram && (
              <ProgramCard
                program={config.draftProgram}
                label="Draft program"
                isActive={false}
              />
            )}

            {!config.activeProgram && !config.draftProgram && (
              <PMVStack
                gap={2}
                align="center"
                padding={4}
                borderRadius="md"
                border="1px dashed"
                borderColor="border.tertiary"
              >
                <PMText fontSize="sm" color="secondary">
                  No detection program yet
                </PMText>
                <PMButton variant="outline" size="xs">
                  Generate program
                </PMButton>
              </PMVStack>
            )}
          </PMVStack>
        </CollapsibleSection>
      )}

      {/* CLI testing */}
      {hasExamples && (
        <>
          <PMSeparator borderColor="border.tertiary" />
          <PMBox
            padding={3}
            borderRadius="md"
            backgroundColor="background.secondary"
          >
            <PMVStack gap={2} align="stretch">
              <PMHStack gap={2} align="center">
                <LuTerminal size={14} />
                <PMText fontSize="xs" fontWeight="medium">
                  Test locally with CLI
                </PMText>
              </PMHStack>
              <PMBox
                padding={2}
                borderRadius="sm"
                backgroundColor="background.primary"
              >
                <PMHStack justify="space-between" align="center">
                  <PMText fontSize="xs" fontFamily="mono" color="secondary">
                    packmind-ci lint --rule{' '}
                    {config.language.toLowerCase().replace(/[() ]/g, '')}
                  </PMText>
                  <PMButton variant="ghost" size="xs" padding={0}>
                    <LuCopy size={12} />
                  </PMButton>
                </PMHStack>
              </PMBox>
            </PMVStack>
          </PMBox>
        </>
      )}
    </PMVStack>
  );
}

/* ─── Main section ─── */

export function LinterSection({ rule }: LinterSectionProps) {
  const [selectedLanguageIndex, setSelectedLanguageIndex] = useState<
    number | null
  >(null);
  const configs = rule.languageConfigs;

  if (selectedLanguageIndex !== null && configs[selectedLanguageIndex]) {
    return (
      <LanguageDetailView
        config={configs[selectedLanguageIndex]}
        onBack={() => setSelectedLanguageIndex(null)}
      />
    );
  }

  return (
    <LanguageListView
      configs={configs}
      onSelectLanguage={setSelectedLanguageIndex}
    />
  );
}
