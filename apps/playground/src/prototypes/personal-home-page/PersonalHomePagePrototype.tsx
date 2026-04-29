import { useCallback, useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMSegmentGroup,
  PMSeparator,
  PMText,
} from '@packmind/ui';
import { LuHouse } from 'react-icons/lu';
import type { SpaceWithPendingReviews, Tip } from './types';
import { STUB_SPACES_WITH_REVIEWS, STUB_TIPS } from './data';
import { PendingReviewsModule } from './components/PendingReviewsModule';
import { TipsModule } from './components/TipsModule';
import { AllCaughtUpState } from './components/AllCaughtUpState';
import { LoadingSkeleton } from './components/LoadingSkeleton';

// ── State presets for reviewer switching ─────────────────────────────────────

type ViewState = 'default' | 'empty' | 'loading' | 'few';

const STATE_OPTIONS = [
  { label: 'Default', value: 'default' as const },
  { label: 'Few reviews', value: 'few' as const },
  { label: 'All caught up', value: 'empty' as const },
  { label: 'Loading', value: 'loading' as const },
];

function getInitialSpaces(state: ViewState): SpaceWithPendingReviews[] {
  switch (state) {
    case 'default':
      return STUB_SPACES_WITH_REVIEWS;
    case 'few':
      return STUB_SPACES_WITH_REVIEWS.slice(0, 1);
    case 'empty':
    case 'loading':
      return [];
  }
}

// ── Main prototype ──────────────────────────────────────────────────────────

export default function PersonalHomePagePrototype() {
  const [viewState, setViewState] = useState<ViewState>('default');
  const [spaces, setSpaces] = useState<SpaceWithPendingReviews[]>(
    STUB_SPACES_WITH_REVIEWS,
  );
  const [tips, setTips] = useState<Tip[]>(STUB_TIPS);

  const handleStateChange = useCallback((value: string) => {
    const state = value as ViewState;
    setViewState(state);
    setSpaces(getInitialSpaces(state));
    setTips(STUB_TIPS);
  }, []);

  const handleAcceptProposal = useCallback(
    (spaceId: string, proposalId: string) => {
      setSpaces((prev) =>
        prev
          .map((s) =>
            s.id === spaceId
              ? {
                  ...s,
                  pendingProposals: s.pendingProposals.filter(
                    (p) => p.id !== proposalId,
                  ),
                }
              : s,
          )
          .filter((s) => s.pendingProposals.length > 0),
      );
    },
    [],
  );

  const handleRejectProposal = useCallback(
    (spaceId: string, proposalId: string) => {
      setSpaces((prev) =>
        prev
          .map((s) =>
            s.id === spaceId
              ? {
                  ...s,
                  pendingProposals: s.pendingProposals.filter(
                    (p) => p.id !== proposalId,
                  ),
                }
              : s,
          )
          .filter((s) => s.pendingProposals.length > 0),
      );
    },
    [],
  );

  const handleViewProposalDetails = useCallback(
    (spaceId: string, proposalId: string) => {
      // In production: navigate to /org/{orgSlug}/space/{spaceSlug}/review-changes/...
      console.log('View details:', spaceId, proposalId);
    },
    [],
  );

  const handleDismissTip = useCallback((tipId: string) => {
    setTips((prev) => prev.filter((t) => t.id !== tipId));
  }, []);

  const handleTipAction = useCallback((tipId: string) => {
    // In production: navigate to relevant feature
    console.log('Tip action:', tipId);
  }, []);

  const hasReviews = spaces.length > 0;
  const isLoading = viewState === 'loading';
  const isAllCaughtUp = !isLoading && !hasReviews;

  return (
    <PMBox height="100%" display="flex" flexDirection="column">
      {/* State switcher toolbar (prototype only) */}
      <PMBox
        paddingX={6}
        paddingY={2}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
        bg="background.secondary"
      >
        <PMHStack gap={3} align="center">
          <PMText fontSize="xs" color="text.faded" fontWeight="medium">
            View state:
          </PMText>
          <PMSegmentGroup.Root
            size="xs"
            value={viewState}
            onValueChange={(e) => handleStateChange(e.value)}
          >
            <PMSegmentGroup.Indicator />
            {STATE_OPTIONS.map((opt) => (
              <PMSegmentGroup.Item key={opt.value} value={opt.value}>
                <PMSegmentGroup.ItemText>{opt.label}</PMSegmentGroup.ItemText>
                <PMSegmentGroup.ItemHiddenInput />
              </PMSegmentGroup.Item>
            ))}
          </PMSegmentGroup.Root>
        </PMHStack>
      </PMBox>

      {/* Page content */}
      <PMBox flex={1} overflowY="auto" paddingX={6} paddingY={8}>
        <PMBox maxW="720px" marginX="auto">
          {/* Page header */}
          <PMHStack gap={3} align="center" marginBottom={8}>
            <PMIcon fontSize="xl" color="text.secondary">
              <LuHouse />
            </PMIcon>
            <PMHeading size="xl">Home</PMHeading>
          </PMHStack>

          {/* Loading state */}
          {isLoading && <LoadingSkeleton />}

          {/* All caught up — celebration state */}
          {isAllCaughtUp && (
            <>
              <AllCaughtUpState />
              {tips.length > 0 && (
                <>
                  <PMSeparator marginY={8} />
                  <TipsModule
                    tips={tips}
                    onDismiss={handleDismissTip}
                    onAction={handleTipAction}
                  />
                </>
              )}
            </>
          )}

          {/* Default state — reviews present */}
          {!isLoading && hasReviews && (
            <>
              <PendingReviewsModule
                spaces={spaces}
                onAcceptProposal={handleAcceptProposal}
                onRejectProposal={handleRejectProposal}
                onViewProposalDetails={handleViewProposalDetails}
              />

              {tips.length > 0 && (
                <>
                  <PMSeparator marginY={8} />
                  <TipsModule
                    tips={tips}
                    onDismiss={handleDismissTip}
                    onAction={handleTipAction}
                  />
                </>
              )}
            </>
          )}
        </PMBox>
      </PMBox>
    </PMBox>
  );
}
