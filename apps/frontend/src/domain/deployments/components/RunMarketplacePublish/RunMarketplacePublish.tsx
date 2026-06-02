import React, { useEffect, useState } from 'react';
import {
  PMAlert,
  PMBadge,
  PMButton,
  PMCloseButton,
  PMDialog,
  PMField,
  PMHStack,
  PMHeading,
  PMPortal,
  PMRadioGroup,
  PMSpinner,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
  MarketplaceId,
  MarketplaceListItem,
  Package,
  PublishFailureReason,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useMarketplaces } from '../../../marketplaces/api/queries/MarketplaceQueries';
import { isPackmindError } from '../../../../services/api/errors/PackmindError';
import {
  INVALID_TOKEN_MESSAGE,
  mapPublishError,
  useMarketplacePublishMutation,
} from '../../api/queries/useMarketplacePublishMutation';
import { MarketplaceListEmptyState } from './MarketplaceListEmptyState';

export interface RunMarketplacePublishProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackages: Package[];
}

const MODAL_TITLE = 'Publish to a marketplace';
const MODAL_SUBTITLE =
  'Pick a linked marketplace. Packmind will open or amend a “Packmind sync” pull request on the marketplace repository so your package becomes a managed plugin.';
const SUBMIT_LABEL = 'Publish';
const SUBMIT_PENDING_LABEL = 'Publishing…';

/**
 * Toast wording per the functional spec (3C). Kept verbatim — especially the
 * invalid-token sentence which the security review pinned to that exact
 * phrasing so the token itself never leaks via a generic message.
 */
const FAILURE_TOAST_MESSAGES: Record<PublishFailureReason, string> = {
  invalid_token: INVALID_TOKEN_MESSAGE,
  name_conflict_unmanaged:
    'The package could not be published. Reason: another plugin with the same name already exists on this marketplace.',
  descriptor_missing:
    'The package could not be published. Reason: the marketplace descriptor (marketplace.json) is missing or malformed.',
  other:
    'The package could not be published. Please try again — if the problem persists, contact an organization admin.',
};

/**
 * Modal exposing the "Publish to a marketplace" channel of the Distribute
 * menu.
 *
 * Currently scoped to a single package per click; the menu only routes here
 * with at least one package selected, but the surrounding `DeployPackageButton`
 * supports bulk selection. We surface that ambiguity inline (only the first
 * package is published) rather than failing silently — the bulk publish flow
 * is out of scope for GH-580.
 */
export const RunMarketplacePublish: React.FC<RunMarketplacePublishProps> = ({
  open,
  onOpenChange,
  selectedPackages,
}) => {
  const { organization } = useAuthContext();
  const {
    data: marketplaces = [],
    isLoading: marketplacesLoading,
    isError: marketplacesHasError,
  } = useMarketplaces(organization?.id ?? '');
  const publishMutation = useMarketplacePublishMutation();

  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState<
    MarketplaceId | undefined
  >();

  // Reset selection whenever the modal opens / closes so a previously
  // selected marketplace doesn't linger across consecutive publishes.
  useEffect(() => {
    if (!open) {
      setSelectedMarketplaceId(undefined);
      publishMutation.reset();
    }
  }, [open, publishMutation]);

  // Auto-pick the only marketplace if there is exactly one, mirroring
  // RunDistribution's "auto-select single target" affordance.
  useEffect(() => {
    if (marketplaces.length === 1) {
      setSelectedMarketplaceId(marketplaces[0].id);
    }
  }, [marketplaces]);

  const packageToPublish = selectedPackages[0];

  const handleSubmit = async () => {
    if (!organization?.id || !selectedMarketplaceId || !packageToPublish) {
      return;
    }

    try {
      const response = await publishMutation.mutateAsync({
        organizationId: organization.id,
        marketplaceId: selectedMarketplaceId,
        packageId: packageToPublish.id,
      });
      pmToaster.success({
        title: 'Publish started',
        description: `Packmind is publishing “${packageToPublish.name}” as “${response.pluginSlug}”. You’ll see the pull request on the marketplace repository shortly.`,
      });
      onOpenChange(false);
    } catch (error) {
      const reason = mapPublishError(error);
      const fallbackDescription = isPackmindError(error)
        ? error.serverError.data.message
        : 'Please try again — if the problem persists, contact an organization admin.';
      pmToaster.error({
        title: 'Publish failed',
        description: FAILURE_TOAST_MESSAGES[reason] ?? fallbackDescription,
      });
    }
  };

  const canSubmit =
    !!packageToPublish &&
    !!selectedMarketplaceId &&
    !marketplacesLoading &&
    !publishMutation.isPending;

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      size="md"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior={'outside'}
    >
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title asChild>
                <PMHeading level="h2">{MODAL_TITLE}</PMHeading>
              </PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMVStack align="stretch" gap={4}>
                <PMText variant="small" color="secondary">
                  {MODAL_SUBTITLE}
                </PMText>

                {selectedPackages.length > 1 && (
                  <PMAlert.Root status="info">
                    <PMAlert.Indicator />
                    <PMAlert.Title>
                      Only “{packageToPublish?.name}” will be published. Pick
                      one package at a time when publishing to a marketplace.
                    </PMAlert.Title>
                  </PMAlert.Root>
                )}

                {marketplacesLoading && (
                  <PMHStack gap={2}>
                    <PMSpinner size="sm" />
                    <PMText variant="small">Loading marketplaces…</PMText>
                  </PMHStack>
                )}

                {marketplacesHasError && (
                  <PMAlert.Root status="error">
                    <PMAlert.Indicator />
                    <PMAlert.Title>
                      Failed to load marketplaces. Please try again later.
                    </PMAlert.Title>
                  </PMAlert.Root>
                )}

                {!marketplacesLoading &&
                  !marketplacesHasError &&
                  marketplaces.length === 0 && <MarketplaceListEmptyState />}

                {!marketplacesLoading &&
                  !marketplacesHasError &&
                  marketplaces.length > 0 && (
                    <PMField.Root>
                      <PMField.Label>Marketplace</PMField.Label>
                      <PMRadioGroup.Root
                        value={selectedMarketplaceId ?? undefined}
                        onValueChange={(details) =>
                          setSelectedMarketplaceId(
                            details.value as MarketplaceId,
                          )
                        }
                      >
                        <PMVStack gap={2} align="stretch">
                          {marketplaces.map((mkt) => (
                            <MarketplaceRadioOption
                              key={mkt.id}
                              marketplace={mkt}
                            />
                          ))}
                        </PMVStack>
                      </PMRadioGroup.Root>
                    </PMField.Root>
                  )}
              </PMVStack>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButton
                variant="tertiary"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={publishMutation.isPending}
              >
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={publishMutation.isPending}
              >
                {publishMutation.isPending
                  ? SUBMIT_PENDING_LABEL
                  : SUBMIT_LABEL}
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};

const MarketplaceRadioOption: React.FC<{
  marketplace: MarketplaceListItem;
}> = ({ marketplace }) => (
  <PMRadioGroup.Item value={marketplace.id}>
    <PMRadioGroup.ItemHiddenInput />
    <PMRadioGroup.ItemControl>
      <PMRadioGroup.ItemIndicator />
    </PMRadioGroup.ItemControl>
    <PMRadioGroup.ItemText>
      <PMHStack gap={2} align="center">
        <PMText>{marketplace.name}</PMText>
        <PMBadge size="sm" variant="subtle">
          {marketplace.pluginCount} plugin
          {marketplace.pluginCount === 1 ? '' : 's'}
        </PMBadge>
      </PMHStack>
    </PMRadioGroup.ItemText>
  </PMRadioGroup.Item>
);
