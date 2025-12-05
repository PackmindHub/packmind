import { useOutletContext, useParams } from 'react-router';
import {
  PMBox,
  PMDataList,
  PMHeading,
  PMPageSection,
  PMVStack,
} from '@packmind/ui';
import { StandardDetailsOutletContext } from '../../src/domain/standards/components/StandardDetails';
import { StandardDistributionsList } from '../../src/domain/deployments/components/StandardDistributionsList/StandardDistributionsList';

export default function StandardDetailDeploymentRouteModule() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { standard, defaultPath } =
    useOutletContext<StandardDetailsOutletContext>();

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
