import { useParams } from 'react-router';
import { PMPage, PMBox, PMVStack } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { KnowledgePatchId } from '@packmind/types';

export default function LearningsPatchDetailsRouteModule() {
  const { patchId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    patchId: string;
  }>();

  if (!patchId) {
    return (
      <PMPage
        title="Patch Not Found"
        subtitle="No patch ID provided"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <p>
            The knowledge patch you're looking for doesn't exist or the ID is
            invalid.
          </p>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <PMPage
      title="Knowledge Patch"
      subtitle="Review and manage this knowledge patch"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <PMBox>Patch details for: {patchId}</PMBox>
      </PMVStack>
    </PMPage>
  );
}
