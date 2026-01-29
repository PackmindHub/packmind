import { useState } from 'react';
import { useParams, Link } from 'react-router';
import {
  PMPage,
  PMButton,
  PMVStack,
  PMMenu,
  PMPortal,
  isFeatureFlagEnabled,
  STANDARD_SAMPLES_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
} from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { StandardsList } from '../../src/domain/standards/components/StandardsList';
import { StandardSamplesModal } from '../../src/domain/standards/components/StandardSamplesModal';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

export default function OrgStandardsIndex() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { organization, user } = useAuthContext();
  const [isSamplesModalOpen, setIsSamplesModalOpen] = useState(false);
  const analytics = useAnalytics();

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
        spaceSlug &&
        (hasSamplesAccess ? (
          <PMMenu.Root>
            <PMMenu.Trigger asChild>
              <PMButton>Create</PMButton>
            </PMMenu.Trigger>
            <PMPortal>
              <PMMenu.Positioner>
                <PMMenu.Content>
                  <PMMenu.Item value="blank" asChild>
                    <Link
                      to={routes.space.toCreateStandard(
                        organization.slug,
                        spaceSlug,
                      )}
                    >
                      Blank
                    </Link>
                  </PMMenu.Item>
                  <PMMenu.Item
                    value="samples"
                    onClick={() => {
                      analytics.track(
                        'create_standard_from_samples_clicked',
                        {},
                      );
                      setIsSamplesModalOpen(true);
                    }}
                  >
                    From samples
                  </PMMenu.Item>
                </PMMenu.Content>
              </PMMenu.Positioner>
            </PMPortal>
          </PMMenu.Root>
        ) : (
          <PMButton asChild>
            <Link
              to={routes.space.toCreateStandard(organization.slug, spaceSlug)}
            >
              Create
            </Link>
          </PMButton>
        ))
      }
    >
      <PMVStack align="stretch" gap={6}>
        <StandardsList orgSlug={organization.slug} />
      </PMVStack>
      <StandardSamplesModal
        open={isSamplesModalOpen}
        onOpenChange={setIsSamplesModalOpen}
      />
    </PMPage>
  );
}
