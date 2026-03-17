import {
  PMAlert,
  PMBadge,
  PMBlockquote,
  PMBox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMSeparator,
  PMTable,
  PMTableColumn,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuLightbulb } from 'react-icons/lu';
import type { SkillReviewSection as SkillReviewSectionType } from './skillReviewMockData';

interface ISkillReviewSectionProps {
  section: SkillReviewSectionType;
}

export const SkillReviewSection = ({ section }: ISkillReviewSectionProps) => {
  const scoreBadgeColor = section.score >= 80 ? 'green' : 'yellow';

  const columns: PMTableColumn[] = [
    { key: 'name', header: 'Dimension', width: '180px' },
    { key: 'reasoning', header: 'Reasoning', grow: true },
    { key: 'score', header: 'Score', width: '80px', align: 'center' },
  ];

  const data = section.dimensions.map((dim) => ({
    key: dim.name,
    name: <PMText>{dim.name}</PMText>,
    reasoning: (
      <PMText fontSize="sm" color="secondary">
        {dim.reasoning}
      </PMText>
    ),
    score: (
      <PMBadge
        colorPalette={dim.score === dim.maxScore ? 'green' : 'yellow'}
        variant="subtle"
        size="sm"
      >
        {dim.score}/{dim.maxScore}
      </PMBadge>
    ),
  }));

  return (
    <PMVStack
      borderWidth="1px"
      borderColor="border.secondary"
      borderRadius="md"
      overflow="hidden"
      backgroundColor={'background.primary'}
      alignItems={'stretch'}
      p={6}
    >
      {/* Section header */}
      <PMBox mb={4}>
        <PMHStack justify="space-between" align="center">
          <PMHStack gap={3} align="center">
            <PMHeading level="h3" fontWeight={'semibold'}>
              {section.title}
            </PMHeading>
            <PMBadge colorPalette={scoreBadgeColor} variant="solid" size="sm">
              {section.score}%
            </PMBadge>
          </PMHStack>
        </PMHStack>
        <PMText color="secondary" fontSize="sm" mt={1}>
          {section.description}
        </PMText>
      </PMBox>

      <PMVStack align="stretch" gap={8}>
        {/* Summary */}
        <PMBlockquote.Root colorPalette={'blue'}>
          <PMBlockquote.Content color={'text.secondary'} fontSize={'md'}>
            {section.summary}
          </PMBlockquote.Content>
        </PMBlockquote.Root>

        {/* Suggestions */}
        {section.suggestions.length > 0 && (
          <PMVStack
            align="stretch"
            gap={2}
            border={'solid 1px '}
            borderColor={'blue.800'}
            p={4}
            borderRadius={'md'}
            backgroundColor={'blue.1000'}
          >
            <PMHStack gap={2} align="center">
              <PMIcon color="blue.200" size={'md'}>
                <LuLightbulb size={14} />
              </PMIcon>
              <PMText fontWeight="semibold">Suggestions</PMText>
            </PMHStack>
            {section.suggestions.map((suggestion, index) => (
              <PMBox
                key={index}
                backgroundColor="background.secondary"
                borderRadius="md"
                px={4}
                py={3}
              >
                <PMText fontSize="sm">{suggestion}</PMText>
              </PMBox>
            ))}
          </PMVStack>
        )}

        {/* Dimensions table */}
        <PMTable
          columns={columns}
          data={data}
          size="sm"
          variant="line"
          tableProps={{ border: 'solid 1px', borderColor: 'border.tertiary' }}
        />
      </PMVStack>
    </PMVStack>
  );
};
