import { Standard } from '@packmind/standards/types';
import { DeployToTargets } from './DeployToTargets';
import { DeploymentsHistory } from './DeploymentsHistory';
import { PMVStack } from '@packmind/ui';
import { TargetWithRepository, TargetId } from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';

interface IDeploymentsPanelProps {
  standard: Standard;
  orgSlug?: string;
  organizationId: OrganizationId;
  handleDeploy: (targetIds: TargetId[]) => Promise<void>;
  isDeploying: boolean;
}

export const DeploymentsPanel = ({
  standard,
  orgSlug,
  organizationId,
  handleDeploy,
  isDeploying,
}: IDeploymentsPanelProps) => {
  const handleTargetDeploy = (targets: TargetWithRepository[]) => {
    // Extract target IDs from targets
    const targetIds = targets.map((target) => target.id);
    handleDeploy(targetIds);
  };

  return (
    <PMVStack gap={6} alignItems="stretch" padding={6} width={'4xl'}>
      <DeployToTargets
        standard={standard}
        organizationId={organizationId}
        onDeploy={handleTargetDeploy}
        loading={isDeploying}
      />
      <DeploymentsHistory standardId={standard.id} orgSlug={orgSlug} />
    </PMVStack>
  );
};
