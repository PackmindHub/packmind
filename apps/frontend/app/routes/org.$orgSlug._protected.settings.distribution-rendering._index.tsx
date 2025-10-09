import { PMPage, PMVStack } from '@packmind/ui';
import { RenderingSettings } from '../../src/domain/deployments/components/RenderingSettings/RenderingSettings';

export default function SettingsDistributionRenderingRouteModule() {
  return (
    <PMPage
      title="Distribution rendering"
      subtitle="Configure for which agents and formats your artifacts are deployed"
    >
      <PMVStack gap={6} align="stretch" maxWidth={'xl'}>
        <RenderingSettings />
      </PMVStack>
    </PMPage>
  );
}
