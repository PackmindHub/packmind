import { useOutletContext } from 'react-router';
import {
  PMBox,
  PMDataList,
  PMHeading,
  PMPageSection,
  PMVStack,
} from '@packmind/ui';
import { StandardDetailsOutletContext } from '../../src/domain/standards/components/StandardDetails';
import { DeployStandardButton } from '../../src/domain/deployments/components/StandardDeployments/DeployStandardButton';
import { DeploymentsHistory } from '../../src/domain/deployments/components/StandardDeployments/StandardDeploymentsList';

export default function StandardDetailDeploymentRouteModule() {
  const { standard, defaultPath } =
    useOutletContext<StandardDetailsOutletContext>();

  return (
    <PMVStack align="stretch" gap={6}>
      <PMPageSection
        title="Run deployment"
        backgroundColor="primary"
        headingLevel="h4"
        boxProps={{ width: 'xl' }}
        cta={
          <DeployStandardButton
            label={`Deploy v${standard.version}`}
            disabled={!standard}
            selectedStandards={[standard]}
            size="sm"
            variant="secondary"
          />
        }
      >
        <PMBox
          marginTop={4}
          padding={4}
          border={'solid 1px'}
          borderColor="border.secondary"
          borderRadius="md"
        >
          <PMHeading level="h5">Deployed file information</PMHeading>
          <PMDataList
            my={2}
            flexDirection={'row'}
            size={'sm'}
            gap={6}
            items={[
              { label: 'Path', value: defaultPath },
              { label: 'Scope', value: standard.scope || '**/*' },
            ]}
          />
        </PMBox>
      </PMPageSection>

      <DeploymentsHistory standardId={standard.id} />
    </PMVStack>
  );
}
