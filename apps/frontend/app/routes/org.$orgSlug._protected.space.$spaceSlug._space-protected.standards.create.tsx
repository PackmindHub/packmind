import { PMPage } from '@packmind/ui';
import { PMVStack } from '@packmind/ui';
import { CreateStandard } from '../../src/domain/standards/components/CreateStandard';

export default function CreateStandardRouteModule() {
  return (
    <PMPage
      title="Create Standard"
      subtitle="Create a new standard for your organization"
    >
      <PMVStack align="stretch" gap={6}>
        <CreateStandard />
      </PMVStack>
    </PMPage>
  );
}
