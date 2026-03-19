import { PMSeparator, PMTabs, PMVStack } from '@packmind/ui';
import type { Skill } from '@packmind/types';

import { SKILL_REVIEW_MOCK_DATA } from './skillReviewMockData';
import { SkillEvalsSection } from './SkillEvalsSection';
import { SkillReviewKPIHeader } from './SkillReviewKPIHeader';
import { SkillReviewSection } from './SkillReviewSection';

interface ISkillReviewPageProps {
  skill: Skill;
}

export const SkillReviewPage = ({ skill }: ISkillReviewPageProps) => {
  const data = SKILL_REVIEW_MOCK_DATA;

  const reviewContent = (
    <PMVStack align="stretch" gap={6} mx="auto" pt={6}>
      {data.sections.map((section) => (
        <SkillReviewSection key={section.title} section={section} />
      ))}
    </PMVStack>
  );

  const tabs = [
    {
      value: 'review',
      triggerLabel: 'Review',
      content: reviewContent,
    },
    {
      value: 'evals',
      triggerLabel: 'Evals',
      content: (
        <PMVStack align="stretch" gap={10} mx="auto" pt={6}>
          {data.evaluations.map((scenario) => (
            <SkillEvalsSection key={scenario.id} scenario={scenario} />
          ))}
        </PMVStack>
      ),
    },
  ];

  return (
    <PMVStack align="stretch" gap={6}>
      <SkillReviewKPIHeader data={data} />

      <PMSeparator />

      <PMTabs tabs={tabs} defaultValue="review" />
    </PMVStack>
  );
};
