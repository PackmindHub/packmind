import { Standard } from '@packmind/standards/types';
import { DeployToRepos } from './DeployToRepos';
import { DeploymentsHistory } from './DeploymentsHistory';
import { GitRepoId } from '@packmind/git/types';
import { PMVStack } from '@packmind/ui';

interface IDeploymentsPanelProps {
  standard: Standard;
  orgSlug?: string;
  handleDeploy: (repositoryIds: GitRepoId[]) => Promise<void>;
  isDeploying: boolean;
}

export const DeploymentsPanel = ({
  standard,
  orgSlug,
  handleDeploy,
  isDeploying,
}: IDeploymentsPanelProps) => {
  return (
    <PMVStack gap={6} alignItems="stretch" padding={6} width={'4xl'}>
      <DeployToRepos
        standard={standard}
        onDeploy={handleDeploy}
        loading={isDeploying}
      />
      <DeploymentsHistory standardId={standard.id} orgSlug={orgSlug} />
    </PMVStack>
  );
};
