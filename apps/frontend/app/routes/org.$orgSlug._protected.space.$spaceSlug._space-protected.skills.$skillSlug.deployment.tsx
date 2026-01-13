import { useParams } from 'react-router';
import {
  PMBox,
  PMDataList,
  PMHeading,
  PMPageSection,
  PMVStack,
  PMEmptyState,
  PMSpinner,
  PMText,
} from '@packmind/ui';
import { SkillDistributionsList } from '../../src/domain/deployments/components/SkillDistributionsList/SkillDistributionsList';
import { useListSkillDistributionsQuery } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { useGetSkillBySlugQuery } from '../../src/domain/skills/api/queries/SkillsQueries';

export default function SkillDetailDeploymentRouteModule() {
  const { orgSlug, spaceSlug, skillSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    skillSlug: string;
  }>();

  const { data: skillWithFiles, isLoading: isLoadingSkill } =
    useGetSkillBySlugQuery(skillSlug);
  const skill = skillWithFiles?.skill;
  const defaultPath = skill ? `.packmind/skills/${skill.slug}.md` : '';

  const { data: distributions, isLoading: isLoadingDistributions } =
    useListSkillDistributionsQuery(skill?.id);
  const hasDistributions = skill && distributions && distributions.length > 0;

  if (isLoadingSkill) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="200px"
      >
        <PMSpinner size="lg" mr={2} />
        <PMText ml={2}>Loading skill...</PMText>
      </PMBox>
    );
  }

  if (!skill) {
    return (
      <PMEmptyState
        backgroundColor={'background.primary'}
        borderRadius={'md'}
        width={'2xl'}
        mx={'auto'}
        title={'Skill not found'}
        description="The skill you're looking for doesn't exist."
      />
    );
  }

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
    <PMVStack align="stretch" gap={6}>
      <PMPageSection
        title="Distributions"
        backgroundColor="primary"
        headingLevel="h4"
        boxProps={{ width: 'xl' }}
      >
        <PMBox
          marginTop={4}
          padding={4}
          border={'solid 1px'}
          borderColor="border.secondary"
          borderRadius="md"
        >
          <PMHeading level="h5">Distributed file information</PMHeading>
          <PMDataList
            my={2}
            flexDirection={'row'}
            size={'sm'}
            gap={6}
            items={[
              { label: 'Path', value: defaultPath },
              {
                label: 'Scope',
                value: <PMBox wordBreak="break-all">**/*</PMBox>,
              },
            ]}
          />
        </PMBox>
      </PMPageSection>

      <SkillDistributionsList
        skillId={skill.id}
        orgSlug={orgSlug || ''}
        spaceSlug={spaceSlug || ''}
      />
    </PMVStack>
  );
}
