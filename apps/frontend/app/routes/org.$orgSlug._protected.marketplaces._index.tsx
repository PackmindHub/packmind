import { useEffect, useState } from 'react';
import { redirect, useNavigate } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { PMPage, pmToaster } from '@packmind/ui';
import type { MarketplaceId, UserOrganizationRole } from '@packmind/types';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import {
  marketplaceQueries,
  useMarketplaces,
  useUnlinkMarketplace,
} from '../../src/domain/marketplaces/api/queries';
import {
  LinkMarketplacePanel,
  MarketplacesIndex,
} from '../../src/domain/marketplaces/components';
import { useAuthContext } from '../../src/domain/accounts/hooks';

type AdminGuardOrganization =
  | { slug: string; role: UserOrganizationRole }
  | undefined;

type HasAccessResponse =
  | {
      hasAccess: true;
      toast?: never;
      redirect?: never;
    }
  | {
      hasAccess: false;
      toast: { title: string; type: string };
      redirect: { url: string };
    };

/**
 * Marketplaces are administered at the organization level: only org admins may
 * link/unlink them (the API rejects mutations from members). This guard keeps
 * non-admin members out of the page even if they reach the URL directly.
 */
function hasAccess(organization: AdminGuardOrganization): HasAccessResponse {
  if (organization && organization.role !== 'admin') {
    return {
      hasAccess: false,
      toast: {
        type: 'error',
        title: 'Marketplaces are limited to administrators',
      },
      redirect: { url: `/org/${organization.slug}` },
    };
  }

  return { hasAccess: true };
}

/**
 * `clientLoader` warms the marketplace list query via
 * `queryClient.ensureQueryData` per `standard-frontend-data-flow.md`, so the
 * route renders with cached data on the first paint.
 */
export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);

  const hasAccessResponse = hasAccess(me.organization);
  if (!hasAccessResponse.hasAccess) {
    pmToaster.create(hasAccessResponse.toast);
    throw redirect(hasAccessResponse.redirect.url);
  }

  try {
    await queryClient.ensureQueryData(
      marketplaceQueries.list({ orgId: me.organization.id }),
    );
  } catch {
    // The live query in the component will surface its own error/loading state.
  }
  return null;
}

export default function MarketplacesRouteModule() {
  const { organization } = useAuthContext();
  const navigate = useNavigate();
  const orgId = organization?.id ?? '';
  const orgSlug = organization?.slug ?? '';
  const { data: marketplaces, isLoading } = useMarketplaces(orgId);
  const unlinkMutation = useUnlinkMarketplace(orgId);
  const [unlinkingId, setUnlinkingId] = useState<MarketplaceId | null>(null);

  const handleUnlink = (marketplaceId: MarketplaceId) => {
    setUnlinkingId(marketplaceId);
    unlinkMutation.mutate(marketplaceId, {
      onSettled: () => setUnlinkingId(null),
    });
  };

  useEffect(() => {
    const hasAccessResponse = hasAccess(organization);
    if (!hasAccessResponse.hasAccess) {
      pmToaster.create(hasAccessResponse.toast);
      navigate(hasAccessResponse.redirect.url);
    }
  }, [organization, navigate]);

  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Marketplaces"
      subtitle="Curate the Git-backed marketplaces enrolled in your organization"
    >
      <LinkMarketplacePanel organizationId={orgId} orgSlug={orgSlug} />
      <MarketplacesIndex
        marketplaces={marketplaces ?? []}
        isLoading={isLoading}
        unlinkingMarketplaceId={unlinkingId}
        onUnlink={handleUnlink}
        organizationId={orgId}
      />
    </PMPage>
  );
}
