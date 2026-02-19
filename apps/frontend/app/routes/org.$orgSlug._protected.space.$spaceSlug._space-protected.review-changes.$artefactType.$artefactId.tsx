import { useParams } from 'react-router';
import { PMBox, PMText } from '@packmind/ui';
import { CommandReviewDetail } from '../../src/domain/change-proposals/components/CommandReviewDetail';
import { SkillReviewDetail } from '../../src/domain/change-proposals/components/SkillReviewDetail';

export default function ReviewChangesDetailRouteModule() {
  const { artefactType, artefactId } = useParams<{
    artefactType: string;
    artefactId: string;
  }>();

  if (!artefactType || !artefactId) return null;

  if (artefactType === 'commands') {
    return <CommandReviewDetail key={artefactId} artefactId={artefactId} />;
  }

  if (artefactType === 'skills') {
    return <SkillReviewDetail key={artefactId} artefactId={artefactId} />;
  }

  return (
    <PMBox
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="300px"
      gridColumn="span 2"
    >
      <PMText color="secondary">
        Review not yet supported for this artefact type
      </PMText>
    </PMBox>
  );
}
