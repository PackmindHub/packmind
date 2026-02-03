import { useState } from 'react';
import { useParams } from 'react-router';
import {
  PMPage,
  PMVStack,
  isFeatureFlagEnabled,
  STANDARD_SAMPLES_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
} from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { StandardsList } from '../../src/domain/standards/components/StandardsList';
import { StandardsCreateButton } from '../../src/domain/standards/components/StandardsCreateButton';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function OrgStandardsIndex() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { organization, user } = useAuthContext();
  const [isEmpty, setIsEmpty] = useState(false);

  const hasSamplesAccess = isFeatureFlagEnabled({
    featureKeys: [STANDARD_SAMPLES_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: user?.email,
  });

  if (!organization || orgSlug !== organization.slug) {
    return null;
  }

  return (
    <PMPage
      title="Standards"
      subtitle="Standards define the rules the AI should always follow — use them to ensure consistent behavior across all interactions."
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        !isEmpty &&
        spaceSlug && (
          <StandardsCreateButton
            orgSlug={organization.slug}
            spaceSlug={spaceSlug}
            hasSamplesAccess={hasSamplesAccess}
          />
        )
      }
    >
      <PMVStack align="stretch" gap={6}>
        <StandardsList
          orgSlug={organization.slug}
          onEmptyStateChange={setIsEmpty}
        />
      </PMVStack>
    </PMPage>
  );
}
