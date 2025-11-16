import { PMPage, PMVStack } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { KnowledgePatchesList } from '../../src/domain/learnings/components/KnowledgePatchesList';

export default function LearningsIndexRouteModule() {
  return (
    <PMPage
      title="Learnings"
      subtitle="Review and manage knowledge patches from your team's learnings"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <KnowledgePatchesList />
      </PMVStack>
    </PMPage>
  );
}
