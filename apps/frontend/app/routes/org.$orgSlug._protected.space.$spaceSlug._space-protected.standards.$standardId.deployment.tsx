import { useOutletContext, useParams } from 'react-router';
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
import { StandardDetailsOutletContext } from '../../src/domain/standards/components/StandardDetails';
import { StandardDistributionsList } from '../../src/domain/deployments/components/StandardDistributionsList/StandardDistributionsList';
import { useListStandardDistributionsQuery } from '../../src/domain/deployments/api/queries/DeploymentsQueries';

export default function StandardDetailDeploymentRouteModule() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { standard, defaultPath } =
    useOutletContext<StandardDetailsOutletContext>();
  const { data: distributions, isLoading: isLoadingDistributions } =
    useListStandardDistributionsQuery(standard.id);
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
        description="This standard has not been distributed."
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
                value: (
                  <PMBox wordBreak="break-all">
                    {standard.scope || '**/*'}
                  </PMBox>
                ),
              },
            ]}
          />
        </PMBox>
      </PMPageSection>

      <StandardDistributionsList
        standardId={standard.id}
        orgSlug={orgSlug || ''}
        spaceSlug={spaceSlug || ''}
      />
    </PMVStack>
  );
}
