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
 * Multi-package publishes are supported: when N packages are selected the
 * modal fans out N parallel publish calls to the same marketplace. The
 * backend serializes the per-package rolling-PR commits via the
 * single-worker BullMQ queue, so the frontend just has to aggregate the
 * outcomes for the toasts.
 *
 * Fan-out across multiple marketplaces is still out of scope: the modal
 * publishes to exactly one marketplace per click.
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
  // `publishMutation` is a fresh object on every render, but its `reset`
  // callback is stable. Depend on the function, not the wrapper object —
  // otherwise the effect below re-runs every render and its `reset()` call
  // re-renders us into an infinite loop ("Maximum update depth exceeded").
  const { reset: resetPublishMutation } = publishMutation;

  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState<
    MarketplaceId | undefined
  >();
  // Local in-flight flag. We can't lean on `publishMutation.isPending` for a
  // batch because each `mutateAsync` resets the hook's state, so the flag
  // would oscillate during a multi-publish fan-out. This stays true across
  // the entire `Promise.allSettled` window.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset selection whenever the modal opens / closes so a previously
  // selected marketplace doesn't linger across consecutive publishes.
  useEffect(() => {
    if (!open) {
      setSelectedMarketplaceId(undefined);
      resetPublishMutation();
    }
  }, [open, resetPublishMutation]);

  // Auto-pick the only marketplace if there is exactly one, mirroring
  // RunDistribution's "auto-select single target" affordance.
  useEffect(() => {
    if (marketplaces.length === 1) {
      setSelectedMarketplaceId(marketplaces[0].id);
    }
  }, [marketplaces]);

  const selectedMarketplace = marketplaces.find(
    (mkt) => mkt.id === selectedMarketplaceId,
  );
  const packageCount = selectedPackages.length;

  const handleSubmit = async () => {
    if (
      !organization?.id ||
      !selectedMarketplaceId ||
      selectedPackages.length === 0
    ) {
      return;
    }

    const marketplaceName = selectedMarketplace?.name ?? 'the marketplace';
    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        selectedPackages.map((pkg) =>
          publishMutation.mutateAsync({
            organizationId: organization.id,
            marketplaceId: selectedMarketplaceId,
            packageId: pkg.id,
          }),
        ),
      );

      const fulfilled = results
        .map((res, idx) => ({ res, pkg: selectedPackages[idx] }))
        .filter(
          (
            entry,
          ): entry is {
            res: PromiseFulfilledResult<
              Awaited<ReturnType<typeof publishMutation.mutateAsync>>
            >;
            pkg: Package;
          } => entry.res.status === 'fulfilled',
        );
      const rejected = results
        .map((res, idx) => ({ res, pkg: selectedPackages[idx] }))
        .filter(
          (
            entry,
          ): entry is {
            res: PromiseRejectedResult;
            pkg: Package;
          } => entry.res.status === 'rejected',
        );

      if (packageCount === 1) {
        // Preserve the original single-package UX verbatim.
        const onlyPkg = selectedPackages[0];
        if (fulfilled.length === 1) {
          const response = fulfilled[0].res.value;
          pmToaster.success({
            title: 'Publish started',
            description: `Packmind is publishing “${onlyPkg.name}” as “${response.pluginSlug}”. You’ll see the pull request on the marketplace repository shortly.`,
          });
          onOpenChange(false);
        } else {
          const error = rejected[0].res.reason;
          const reason = mapPublishError(error);
          const fallbackDescription = isPackmindError(error)
            ? error.serverError.data.message
            : 'Please try again — if the problem persists, contact an organization admin.';
          pmToaster.error({
            title: 'Publish failed',
            description: FAILURE_TOAST_MESSAGES[reason] ?? fallbackDescription,
          });
        }
        return;
      }

      // Multi-package aggregation.
      if (rejected.length === 0) {
        pmToaster.success({
          title: 'Publishing started',
          description: `Packmind is publishing ${packageCount} packages to ${marketplaceName}. You’ll see the pull request on the marketplace repository shortly.`,
        });
        onOpenChange(false);
        return;
      }

      if (fulfilled.length === 0) {
        const dominantReason = pickDominantReason(
          rejected.map((entry) => mapPublishError(entry.res.reason)),
        );
        pmToaster.error({
          title: 'Publish failed',
          description: `No packages could be published. Most common reason: ${FAILURE_TOAST_MESSAGES[dominantReason]}`,
        });
        return;
      }

      // Mixed outcome: some publishes started, some failed.
      const failingNames = rejected
        .map((entry) => `“${entry.pkg.name}”`)
        .join(', ');
      pmToaster.warning({
        title: 'Some publishes failed',
        description: `${fulfilled.length} of ${packageCount} packages are being published to ${marketplaceName}. ${rejected.length} failed: ${failingNames}.`,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    selectedPackages.length > 0 &&
    !!selectedMarketplaceId &&
    !marketplacesLoading &&
    !isSubmitting;

  const submitLabel = (() => {
    if (isSubmitting) {
      return packageCount > 1
        ? `Publishing ${packageCount} packages…`
        : SUBMIT_PENDING_LABEL;
    }
    return packageCount > 1 ? `Publish ${packageCount} packages` : SUBMIT_LABEL;
  })();

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
                disabled={isSubmitting}
              >
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={isSubmitting}
              >
                {submitLabel}
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

/**
 * Picks the most frequent failure reason across rejected publishes, with
 * `'other'` as the tie-breaking fallback. Used for the all-failed multi
 * publish toast so the user sees the dominant cause first.
 */
const pickDominantReason = (
  reasons: PublishFailureReason[],
): PublishFailureReason => {
  if (reasons.length === 0) {
    return 'other';
  }
  const counts = new Map<PublishFailureReason, number>();
  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  let dominant: PublishFailureReason = reasons[0];
  let dominantCount = 0;
  for (const [reason, count] of counts) {
    if (count > dominantCount) {
      dominant = reason;
      dominantCount = count;
    }
  }
  return dominant;
};
