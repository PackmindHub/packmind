import { PMBox, PMCard, PMLink, PMText, PMVStack } from '@packmind/ui';
import type { SkillReviewData } from './skillReviewMockData';

interface ISkillReviewRightSidebarProps {
  reviewData: SkillReviewData;
}

export const SkillReviewRightSidebar = ({
  reviewData,
}: ISkillReviewRightSidebarProps) => {
  return (
    <PMVStack align="stretch" gap={6} width="240px" flexShrink={0}>
      <PMText fontSize="sm" color="secondary">
        Reviewed {reviewData.reviewedDaysAgo} days ago
      </PMText>

      <PMVStack align="stretch" gap={2}>
        <PMText fontWeight="semibold" fontSize="sm">
          Table of Contents
        </PMText>
        {reviewData.sections.map((section) => (
          <PMLink
            key={section.title}
            href={`#${section.title.toLowerCase()}`}
            fontSize="sm"
            color="text.link"
          >
            {section.title}
          </PMLink>
        ))}
      </PMVStack>

      <PMCard.Root size="sm" variant="outline">
        <PMCard.Body>
          <PMBox>
            <PMText fontWeight="semibold" fontSize="sm" mb={1}>
              Is this your skill?
            </PMText>
            <PMText fontSize="xs" color="secondary">
              If you created this skill, you can improve it by following the
              suggestions above.
            </PMText>
          </PMBox>
        </PMCard.Body>
      </PMCard.Root>
    </PMVStack>
  );
};
