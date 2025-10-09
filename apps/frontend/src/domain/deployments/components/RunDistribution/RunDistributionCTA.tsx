import { useRunDistribution } from './RunDistribution';
import { PMButton } from '@packmind/ui';

export const RunDistributionCTAImpl: React.FC<{ label?: string }> = () => {
  const {
    deploy,
    isDeploying,
    canRunDistribution,
    shouldShowRenderingSettings,
  } = useRunDistribution();

  if (shouldShowRenderingSettings) {
    return null;
  }

  return (
    <PMButton
      variant="primary"
      onClick={deploy}
      loading={isDeploying}
      size="sm"
      disabled={!canRunDistribution}
    >
      Deploy
    </PMButton>
  );
};
