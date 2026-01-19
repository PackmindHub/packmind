import { useOutletContext, useParams } from 'react-router';
import { PMBox, PMEmptyState, PMSpinner, PMText } from '@packmind/ui';
import type { ISkillDetailsOutletContext } from './org.$orgSlug._protected.space.$spaceSlug._space-protected.skills.$skillSlug';
import { SkillDistributionsList } from '../../src/domain/deployments/components/SkillDistributionsList/SkillDistributionsList';
import { useListSkillDistributionsQuery } from '../../src/domain/deployments/api/queries/DeploymentsQueries';

export default function SkillDistributionsRouteModule() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { skill } = useOutletContext<ISkillDetailsOutletContext>();

  const { data: distributions, isLoading: isLoadingDistributions } =
    useListSkillDistributionsQuery(skill.id);
  const hasDistributions = distributions && distributions.length > 0;

  if (isLoadingDistributions) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="200px"
      >
        <PMSpinner size="lg" mr={2} />
        <PMText ml={2}>Loading distributions...</PMText>
      </PMBox>
    );
  }

  if (!hasDistributions) {
    return (
      <PMEmptyState
        backgroundColor={'background.primary'}
        borderRadius={'md'}
        width={'2xl'}
        mx={'auto'}
        title={'No distributions yet'}
        description="This skill has not been distributed."
      />
    );
  }

  return (
    <SkillDistributionsList
      skillId={skill.id}
      orgSlug={orgSlug || ''}
      spaceSlug={spaceSlug || ''}
    />
  );
}
