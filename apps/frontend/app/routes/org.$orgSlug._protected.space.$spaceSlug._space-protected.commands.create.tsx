import { PMPage } from '@packmind/ui';
import { PMVStack } from '@packmind/ui';
import { CreateCommand } from '../../src/domain/recipes/components/CreateCommand';

export default function CreateCommandRouteModule() {
  return (
    <PMPage
      title="Create Command"
      subtitle="Create a new command for your organization"
    >
      <PMVStack align="stretch" gap={6}>
        <CreateCommand />
      </PMVStack>
    </PMPage>
  );
}
