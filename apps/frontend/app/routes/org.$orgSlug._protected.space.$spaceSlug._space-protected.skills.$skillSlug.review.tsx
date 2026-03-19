import { useOutletContext } from 'react-router';
import type { ISkillDetailsOutletContext } from './org.$orgSlug._protected.space.$spaceSlug._space-protected.skills.$skillSlug';
import { SkillReviewPage } from '../../src/domain/skills/components/SkillReview/SkillReviewPage';

export default function SkillReviewRouteModule() {
  const { skill } = useOutletContext<ISkillDetailsOutletContext>();

  return <SkillReviewPage skill={skill} />;
}
