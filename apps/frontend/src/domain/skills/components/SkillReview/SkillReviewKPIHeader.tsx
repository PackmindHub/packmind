import {
  PMBadge,
  PMBox,
  PMButton,
  PMGrid,
  PMHStack,
  PMIcon,
  PMProgress,
  PMStat,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuChartBar,
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
          width="12px"
          height="20px"
          borderRadius="2px"
          backgroundColor="green.400"
        />
      ))}
      {Array.from({ length: failed }).map((_, i) => (
        <PMBox
          key={`fail-${i}`}
          width="12px"
          height="20px"
          borderRadius="2px"
          backgroundColor="yellow.400"
        />
      ))}
    </PMHStack>
  );
};

interface SkillReviewKPIHeaderProps {
  data: SkillReviewData;
  showOptimizeButton?: boolean;
}

export const SkillReviewKPIHeader = ({
  data,
  showOptimizeButton = true,
}: SkillReviewKPIHeaderProps) => {
  return (
    <PMGrid
      templateColumns="1fr 4fr"
      gap={8}
      alignItems="start"
      backgroundColor={'background.primary'}
      p={6}
      borderRadius={'md'}
    >
      {/* Left — Overall score */}
      <PMVStack height={'full'} alignItems={'center'} justifyContent={'center'}>
        <PMVStack
          gap={3}
          align="center"
          alignSelf="center"
          borderWidth="1px"
          borderColor="green.600"
          backgroundColor={'green.1000'}
          p={14}
          borderRadius={'md'}
        >
          <PMStat.Root size="lg">
            <PMStat.Label color={'text.primary'} fontWeight={'semibold'}>
              Overall score
            </PMStat.Label>
            <PMStat.ValueText color="green.400" fontSize={'4xl'}>
              {data.overallScore}
              <PMStat.ValueUnit>%</PMStat.ValueUnit>
            </PMStat.ValueText>
          </PMStat.Root>
          {showOptimizeButton && (
            <PMButton variant="tertiary" size="xs">
              <LuChartBar />
              Optimize
            </PMButton>
          )}
        </PMVStack>
      </PMVStack>

      {/* Right — Stacked metric cards */}
      <PMVStack gap={2} align="stretch">
        {/* Review */}
        <PMVStack
          gap={2}
          align="stretch"
          border={'solid 1px'}
          borderColor={'border.tertiary'}
          p={4}
          borderRadius={'md'}
        >
          <PMHStack gap={3} alignItems={'flex-start'}>
            <PMIcon color="text.tertiary">
              <LuClipboardCheck size={20} />
            </PMIcon>
            <PMVStack gap={0} flex={1} alignItems={'flex-start'}>
              <PMText
                fontWeight="semibold"
                textTransform="uppercase"
                fontSize="sm"
              >
                Review
              </PMText>
              <PMText fontSize="xs" color="tertiary">
                Does it follow best practices?
              </PMText>
            </PMVStack>
            <PMText fontSize="lg" fontWeight="semibold">
              {data.reviewScore}%
            </PMText>
          </PMHStack>
          <PMProgress.Root
            value={data.reviewScore}
            size="md"
            colorPalette="green"
          >
            <PMProgress.Track>
              <PMProgress.Range />
            </PMProgress.Track>
          </PMProgress.Root>
        </PMVStack>

        {/* Evaluation */}
        <PMVStack
          gap={2}
          align="stretch"
          border={'solid 1px'}
          borderColor={'border.tertiary'}
          p={4}
          borderRadius={'md'}
        >
          <PMHStack gap={3} alignItems={'flex-start'}>
            <PMIcon color="text.tertiary">
              <LuCircleCheck size={20} />
            </PMIcon>
            <PMVStack gap={0} flex={1} alignItems={'flex-start'}>
              <PMHStack gap={2} align="center">
                <PMText
                  fontWeight="semibold"
                  textTransform="uppercase"
                  fontSize="sm"
                >
                  Evaluation
                </PMText>
                <PMBadge colorPalette="green" variant="surface" size="sm">
                  <LuTrendingUp size={12} />
                  {data.evaluationMultiplier}x
                </PMBadge>
              </PMHStack>
              <PMText fontSize="xs" color="tertiary">
                Agent success when using this skill
              </PMText>
            </PMVStack>
            <PMText fontSize="lg" fontWeight="semibold">
              {data.evaluationScore}%
            </PMText>
          </PMHStack>
          <PMHStack gap={4} align="center">
            <PMText fontSize="xs" color="secondary" flexShrink={0}>
              Skill
            </PMText>
            <PMBox flex={1}>
              <PMProgress.Root
                value={data.evaluationScore}
                size="sm"
                colorPalette="green"
              >
                <PMProgress.Track>
                  <PMProgress.Range />
                </PMProgress.Track>
              </PMProgress.Root>
            </PMBox>
          </PMHStack>
          <PMHStack gap={4} align="center">
            <PMText fontSize="xs" color="secondary" flexShrink={0}>
              Baseline
            </PMText>
            <PMBox flex={1}>
              <PMProgress.Root
                value={data.evaluationBaseline}
                size="sm"
                colorPalette="blue"
              >
                <PMProgress.Track>
                  <PMProgress.Range />
                </PMProgress.Track>
              </PMProgress.Root>
            </PMBox>
          </PMHStack>
        </PMVStack>

        {/* Validation */}
        <PMVStack
          gap={2}
          align="stretch"
          border={'solid 1px'}
          borderColor={'border.tertiary'}
          p={4}
          borderRadius={'md'}
        >
          <PMHStack gap={3} alignItems={'flex-start'}>
            <PMIcon color="text.tertiary">
              <LuShieldCheck size={20} />
            </PMIcon>
            <PMVStack gap={0} flex={1} alignItems={'flex-start'}>
              <PMText
                fontWeight="semibold"
                textTransform="uppercase"
                fontSize="sm"
              >
                Validation
              </PMText>
              <PMText fontSize="xs" color="tertiary">
                Skill structure checks
              </PMText>
            </PMVStack>
            <PMText fontSize="lg" fontWeight="semibold">
              {data.validationPassed} / {data.validationTotal}
            </PMText>
          </PMHStack>
          <ValidationBlocks
            passed={data.validationPassed}
            total={data.validationTotal}
          />
        </PMVStack>
      </PMVStack>
    </PMGrid>
  );
};
