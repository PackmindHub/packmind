import { useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMGrid,
  PMHeading,
  PMHStack,
  PMIcon,
  PMProgress,
  PMStat,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuChevronDown,
  LuChevronUp,
  LuCircleCheck,
  LuClipboardCheck,
  LuShieldCheck,
  LuTrendingUp,
} from 'react-icons/lu';

import type { SkillReviewData } from './skillReviewMockData';

const ValidationBlocks = ({
  passed,
  total,
}: {
  passed: number;
  total: number;
}) => {
  const failed = total - passed;
  return (
    <PMHStack gap="2px">
      {Array.from({ length: passed }).map((_, i) => (
        <PMBox
          key={`pass-${i}`}
          width="10px"
          height="16px"
          borderRadius="2px"
          backgroundColor="green.400"
        />
      ))}
      {Array.from({ length: failed }).map((_, i) => (
        <PMBox
          key={`fail-${i}`}
          width="10px"
          height="16px"
          borderRadius="2px"
          backgroundColor="yellow.400"
        />
      ))}
    </PMHStack>
  );
};

function ScoreDelta({
  from,
  to,
  unit = '%',
}: {
  from: number;
  to: number;
  unit?: string;
}) {
  const delta = to - from;
  if (delta === 0) return null;
  return (
    <PMBadge colorPalette="green" variant="surface" size="sm">
      <LuTrendingUp size={12} />+{delta}
      {unit}
    </PMBadge>
  );
}

function OverallScoreColumn({
  data,
  label,
  borderColor,
  bgColor,
  scoreColor,
}: {
  data: SkillReviewData;
  label: string;
  borderColor: string;
  bgColor: string;
  scoreColor: string;
}) {
  return (
    <PMVStack gap={3} align="center">
      <PMText
        fontSize="2xs"
        fontWeight="medium"
        textTransform="uppercase"
        color="faded"
      >
        {label}
      </PMText>
      <PMVStack
        gap={2}
        align="center"
        justifyContent="center"
        borderWidth="1px"
        borderColor={borderColor}
        backgroundColor={bgColor}
        borderRadius="md"
        aspectRatio="1/1"
        width="280px"
      >
        <PMBox>
          <PMStat.Root size="lg">
            <PMStat.ValueText color={scoreColor} fontSize="4xl">
              {data.overallScore}
              <PMStat.ValueUnit>%</PMStat.ValueUnit>
            </PMStat.ValueText>
          </PMStat.Root>
        </PMBox>
      </PMVStack>
    </PMVStack>
  );
}

function MetricRow({
  icon,
  title,
  subtitle,
  originalValue,
  newValue,
  renderOriginal,
  renderNew,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  originalValue: number;
  newValue: number;
  renderOriginal: React.ReactNode;
  renderNew: React.ReactNode;
}) {
  return (
    <PMVStack
      gap={3}
      align="stretch"
      border="solid 1px"
      borderColor="border.tertiary"
      p={4}
      borderRadius="md"
    >
      <PMHStack gap={3} alignItems="flex-start">
        <PMIcon color="text.tertiary">{icon}</PMIcon>
        <PMVStack gap={0} flex={1} alignItems="flex-start">
          <PMHStack gap={2} align="center">
            <PMText
              fontWeight="semibold"
              textTransform="uppercase"
              fontSize="sm"
            >
              {title}
            </PMText>
            <ScoreDelta from={originalValue} to={newValue} />
          </PMHStack>
          <PMText fontSize="xs" color="tertiary">
            {subtitle}
          </PMText>
        </PMVStack>
      </PMHStack>
      <PMGrid templateColumns="1fr auto 1fr" gap={4} alignItems="center" px={8}>
        <PMBox>{renderOriginal}</PMBox>
        <PMIcon color="text.tertiary">
          <LuArrowRight size={16} />
        </PMIcon>
        <PMBox>{renderNew}</PMBox>
      </PMGrid>
    </PMVStack>
  );
}

function ScoreBar({
  value,
  label,
  colorPalette,
}: {
  value: number;
  label: string;
  colorPalette: string;
}) {
  return (
    <PMVStack gap={1} align="stretch">
      <PMHStack justify="space-between">
        <PMText fontSize="xs" color="secondary">
          {label}
        </PMText>
        <PMText fontSize="xs" fontWeight="semibold">
          {value}%
        </PMText>
      </PMHStack>
      <PMProgress.Root value={value} size="sm" colorPalette={colorPalette}>
        <PMProgress.Track>
          <PMProgress.Range />
        </PMProgress.Track>
      </PMProgress.Root>
    </PMVStack>
  );
}

interface SkillReviewKPIComparisonProps {
  originalData: SkillReviewData;
  newData: SkillReviewData;
}

export const SkillReviewKPIComparison = ({
  originalData,
  newData,
}: SkillReviewKPIComparisonProps) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <PMVStack
      gap={4}
      align="stretch"
      backgroundColor="background.primary"
      p={6}
      borderRadius="md"
    >
      <PMHeading level="h4" fontWeight={'semibold'}>
        Evaluation evolution
      </PMHeading>
      {/* Overall score comparison */}
      <PMGrid templateColumns="1fr auto 1fr" gap={6} alignItems="center">
        <PMBox display="flex" justifyContent="center">
          <OverallScoreColumn
            data={originalData}
            label="Current"
            borderColor="border.tertiary"
            bgColor="background.secondary"
            scoreColor="text.secondary"
          />
        </PMBox>
        <PMIcon color="text.tertiary">
          <LuArrowRight size={20} />
        </PMIcon>
        <PMBox display="flex" justifyContent="center">
          <OverallScoreColumn
            data={newData}
            label="With changes"
            borderColor="green.600"
            bgColor="green.1000"
            scoreColor="green.400"
          />
        </PMBox>
      </PMGrid>

      {/* Toggle details */}
      <PMBox textAlign="left">
        <PMButton
          variant="secondary"
          size="xs"
          onClick={() => setShowDetails((prev) => !prev)}
        >
          {showDetails ? <LuChevronUp /> : <LuChevronDown />}
          {showDetails ? 'Hide details' : 'Show details'}
        </PMButton>
      </PMBox>

      {/* Sub-scores (collapsible) */}
      {showDetails && (
        <>
          {/* Review metric */}
          <MetricRow
            icon={<LuClipboardCheck size={20} />}
            title="Review"
            subtitle="Does it follow best practices?"
            originalValue={originalData.reviewScore}
            newValue={newData.reviewScore}
            renderOriginal={
              <ScoreBar
                value={originalData.reviewScore}
                label="Current"
                colorPalette="blue"
              />
            }
            renderNew={
              <ScoreBar
                value={newData.reviewScore}
                label="With changes"
                colorPalette="green"
              />
            }
          />

          {/* Evaluation metric */}
          <MetricRow
            icon={<LuCircleCheck size={20} />}
            title="Evaluation"
            subtitle="Agent success when using this skill"
            originalValue={originalData.evaluationScore}
            newValue={newData.evaluationScore}
            renderOriginal={
              <PMVStack gap={1} align="stretch">
                <PMHStack justify="space-between">
                  <PMText
                    fontSize="xs"
                    color="secondary"
                    fontWeight={'semibold'}
                  >
                    Current
                  </PMText>
                  <PMBadge colorPalette="gray" variant="surface" size="sm">
                    {originalData.evaluationMultiplier}x
                  </PMBadge>
                </PMHStack>
                <ScoreBar
                  value={originalData.evaluationScore}
                  label="Skill"
                  colorPalette="blue"
                />
                <ScoreBar
                  value={originalData.evaluationBaseline}
                  label="Baseline"
                  colorPalette="blue"
                />
              </PMVStack>
            }
            renderNew={
              <PMVStack gap={1} align="stretch">
                <PMHStack justify="space-between">
                  <PMText
                    fontSize="xs"
                    color="secondary"
                    fontWeight={'semibold'}
                  >
                    With changes
                  </PMText>
                  <PMBadge colorPalette="green" variant="surface" size="sm">
                    <LuTrendingUp size={12} />
                    {newData.evaluationMultiplier}x
                  </PMBadge>
                </PMHStack>
                <ScoreBar
                  value={newData.evaluationScore}
                  label="Skill"
                  colorPalette="green"
                />
                <ScoreBar
                  value={newData.evaluationBaseline}
                  label="Baseline"
                  colorPalette="green"
                />
              </PMVStack>
            }
          />

          {/* Validation metric */}
          <PMVStack
            gap={3}
            align="stretch"
            border="solid 1px"
            borderColor="border.tertiary"
            p={4}
            borderRadius="md"
          >
            <PMHStack gap={3} alignItems="flex-start">
              <PMIcon color="text.tertiary">
                <LuShieldCheck size={20} />
              </PMIcon>
              <PMVStack gap={0} flex={1} alignItems="flex-start">
                <PMHStack gap={2} align="center">
                  <PMText
                    fontWeight="semibold"
                    textTransform="uppercase"
                    fontSize="sm"
                  >
                    Validation
                  </PMText>
                  <ScoreDelta
                    from={originalData.validationPassed}
                    to={newData.validationPassed}
                    unit=""
                  />
                </PMHStack>
                <PMText fontSize="xs" color="tertiary">
                  Skill structure checks
                </PMText>
              </PMVStack>
            </PMHStack>
            <PMGrid templateColumns="1fr auto 1fr" gap={4} alignItems="center">
              <PMVStack gap={1}>
                <PMText fontSize="xs" color="secondary" fontWeight={'semibold'}>
                  Current
                </PMText>
                <PMText fontSize="sm" fontWeight="semibold">
                  {originalData.validationPassed} /{' '}
                  {originalData.validationTotal}
                </PMText>
                <ValidationBlocks
                  passed={originalData.validationPassed}
                  total={originalData.validationTotal}
                />
              </PMVStack>
              <PMIcon color="text.tertiary">
                <LuArrowRight size={16} />
              </PMIcon>
              <PMVStack gap={1}>
                <PMText fontSize="xs" color="secondary" fontWeight={'semibold'}>
                  With changes
                </PMText>
                <PMText fontSize="sm" fontWeight="semibold">
                  {newData.validationPassed} / {newData.validationTotal}
                </PMText>
                <ValidationBlocks
                  passed={newData.validationPassed}
                  total={newData.validationTotal}
                />
              </PMVStack>
            </PMGrid>
          </PMVStack>
        </>
      )}
    </PMVStack>
  );
};
