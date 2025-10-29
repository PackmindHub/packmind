import { PMPage } from '@packmind/ui';
import { PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { AgentBlueprintsList } from '../../src/domain/agent-blueprints/components/AgentBlueprintsList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function OrgAgentBlueprintsIndex() {
  const { organization } = useAuthContext();
  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Agent Blueprints"
      subtitle="Create and manage your agent blueprints"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <AgentBlueprintsList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
