import { PMPage, PMVStack } from '@packmind/ui';
import { TopicsList } from '../../src/domain/learnings/components/TopicsList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function TopicsIndexRouteModule() {
  return (
    <PMPage
      title="Topics"
      subtitle="View and manage captured learning topics"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <TopicsList />
      </PMVStack>
    </PMPage>
  );
}
