import {
  PMBadge,
  PMBox,
  PMHStack,
  PMHeading,
  PMTable,
  PMTableColumn,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowUp,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleX,
  LuInfo,
} from 'react-icons/lu';
import type { EvalRunMetadata, EvalScenario } from './skillReviewMockData';

interface ISkillEvalsSectionProps {
  scenario: EvalScenario;
}

const ScoreCell = ({ score }: { score: number }) => {
  let icon;
  let color;

  if (score === 0) {
    icon = <LuCircleX />;
    color = 'red.400';
  } else if (score === 100) {
    icon = <LuCircleCheck />;
    color = 'green.400';
  } else {
    icon = <LuCircleAlert />;
    color = 'yellow.500';
  }

  return (
    <PMHStack gap={1} justify="center">
      <PMBox color={color}>{icon}</PMBox>
      <PMText fontSize="sm">{score}%</PMText>
    </PMHStack>
  );
};

const formatMeta = (label: string, meta: EvalRunMetadata) =>
  `${label}: ${meta.cost} · ${meta.duration} · ${meta.turns} turns · ${meta.inputTokens.toLocaleString()} in / ${meta.outputTokens.toLocaleString()} out tokens`;

export const SkillEvalsSection = ({ scenario }: ISkillEvalsSectionProps) => {
  const columns: PMTableColumn[] = [
    { key: 'criteria', header: 'Criteria', grow: true },
    {
      key: 'withoutContext',
      header: 'Without context',
      width: '200px',
      align: 'center',
    },
    {
      key: 'withContext',
      header: 'With context',
      width: '200px',
      align: 'center',
    },
  ];

  const data = scenario.criteria.map((criterion) => ({
    key: criterion.name,
    criteria: (
      <PMHStack gap={1} align="center">
        <PMText fontSize="sm" fontWeight="medium">
          {criterion.name}
        </PMText>
        <PMTooltip label={criterion.description}>
          <PMBox color="text.secondary" cursor="pointer">
            <LuInfo size={14} />
          </PMBox>
        </PMTooltip>
      </PMHStack>
    ),
    withoutContext: <ScoreCell score={criterion.scoreWithoutContext} />,
    withContext: <ScoreCell score={criterion.scoreWithContext} />,
  }));

  const scoreBadgeColor = scenario.overallScore >= 80 ? 'green' : 'yellow';

  return (
    <PMVStack
      borderWidth="1px"
      borderColor="border.secondary"
      borderRadius="md"
      backgroundColor={'background.primary'}
      alignItems={'stretch'}
      p={6}
    >
      {/* Section header */}
      <PMBox mb={4}>
        <PMHStack justify="space-between" align="center">
          <PMHStack gap={3} align="center">
            <PMHeading level="h3" fontWeight={'semibold'}>
              {scenario.title}
            </PMHeading>
            <PMBadge colorPalette={scoreBadgeColor} variant="solid" size="sm">
              {scenario.overallScore}%
            </PMBadge>
            <PMBadge colorPalette="green" variant="surface" size="sm">
              <LuArrowUp size={12} />
              {scenario.improvement}%
            </PMBadge>
          </PMHStack>
        </PMHStack>
        <PMText color="secondary" fontSize="sm" mt={1}>
          {scenario.description}
        </PMText>
      </PMBox>

      <PMVStack align="stretch" gap={8}>
        {/* Criteria table */}
        <PMTable
          columns={columns}
          data={data}
          size="sm"
          variant="line"
          tableProps={{ border: 'solid 1px', borderColor: 'border.tertiary' }}
        />

        {/* Run metadata */}
        <PMVStack gap={1} align="flex-start">
          <PMText fontSize="xs" color="secondary">
            {formatMeta('Without context', scenario.withoutContextMeta)}
          </PMText>
          <PMText fontSize="xs" color="secondary">
            {formatMeta('With context', scenario.withContextMeta)}
          </PMText>
        </PMVStack>
      </PMVStack>
    </PMVStack>
  );
};
