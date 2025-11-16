import React from 'react';
import { useParams, Link } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHStack,
  PMButton,
  PMHeading,
  PMText,
  PMBadge,
  PMAlert,
  PMDiffView,
} from '@packmind/ui';
import {
  KnowledgePatchId,
  KnowledgePatchStatus,
  KnowledgePatchType,
} from '@packmind/types';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';
import {
  useGetKnowledgePatchByIdQuery,
  useAcceptKnowledgePatchMutation,
  useRejectKnowledgePatchMutation,
} from '../api/queries/LearningsQueries';
import { routes } from '../../../shared/utils/routes';

interface KnowledgePatchDetailsProps {
  patchId: KnowledgePatchId;
}

export const KnowledgePatchDetails = ({
  patchId,
}: KnowledgePatchDetailsProps) => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { data, isLoading, isError } = useGetKnowledgePatchByIdQuery(patchId);
  const acceptMutation = useAcceptKnowledgePatchMutation();
  const rejectMutation = useRejectKnowledgePatchMutation();
  const [reviewNotes, setReviewNotes] = React.useState('');

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync({
        patchId,
        reviewNotes: reviewNotes || undefined,
      });
    } catch (error) {
      console.error('Failed to accept patch:', error);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      alert('Please provide review notes for rejection');
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        patchId,
        reviewNotes,
      });
    } catch (error) {
      console.error('Failed to reject patch:', error);
    }
  };

  if (isLoading) {
    return <PMBox>Loading patch details...</PMBox>;
  }

  if (isError || !data) {
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Title>Failed to load patch details</PMAlert.Title>
        <PMAlert.Description>
          An error occurred while fetching the knowledge patch
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  const patch = data.patch;
  const topics = data.topics || [];
  const isPending = patch.status === KnowledgePatchStatus.PENDING_REVIEW;
  const isNewArtifact =
    patch.patchType === KnowledgePatchType.NEW_STANDARD ||
    patch.patchType === KnowledgePatchType.NEW_RECIPE;

  return (
    <PMVStack align="stretch" gap={6}>
      {/* Status Badge */}
      <PMBox>
        <PMBadge
          colorScheme={
            patch.status === KnowledgePatchStatus.ACCEPTED
              ? 'green'
              : patch.status === KnowledgePatchStatus.REJECTED
                ? 'red'
                : 'yellow'
          }
        >
          {patch.status}
        </PMBadge>
      </PMBox>

      {/* Related Topics */}
      {topics.length > 0 && orgSlug && spaceSlug && (
        <PMBox p={4} borderWidth="1px" borderRadius="md">
          <PMHeading size="sm" mb={3}>
            Related Topics
          </PMHeading>
          <PMHStack gap={2} flexWrap="wrap">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                to={routes.space.toTopic(orgSlug, spaceSlug, topic.id)}
                style={{ textDecoration: 'none' }}
              >
                <PMBadge colorScheme="blue" size="lg" cursor="pointer">
                  {topic.title}
                </PMBadge>
              </Link>
            ))}
          </PMHStack>
        </PMBox>
      )}

      {/* Patch Type */}
      <PMBox p={4} borderWidth="1px" borderRadius="md">
        <PMHeading size="sm" mb={2}>
          Patch Type
        </PMHeading>
        <PMText>{patch.patchType}</PMText>
      </PMBox>

      {/* Content Preview */}
      <PMBox p={4} borderWidth="1px" borderRadius="md">
        <PMHeading size="sm" mb={4}>
          {isNewArtifact ? 'Proposed Content' : 'Changes Preview'}
        </PMHeading>
        {isNewArtifact ? (
          <MarkdownEditorProvider>
            <MarkdownEditor defaultValue={patch.diffModified} readOnly />
          </MarkdownEditorProvider>
        ) : (
          <PMDiffView
            original={
              patch.diffOriginal.endsWith('\n')
                ? patch.diffOriginal
                : `${patch.diffOriginal}\n`
            }
            modified={
              patch.diffModified.endsWith('\n')
                ? patch.diffModified
                : `${patch.diffModified}\n`
            }
            language="markdown"
            height="400px"
            showViewToggle={true}
            wrapLines={true}
          />
        )}
      </PMBox>

      {/* Review Notes (if reviewed) */}
      {patch.reviewNotes && (
        <PMBox p={4} borderWidth="1px" borderRadius="md">
          <PMHeading size="sm" mb={2}>
            Review Notes
          </PMHeading>
          <PMText>{patch.reviewNotes}</PMText>
        </PMBox>
      )}

      {/* Review Actions (if pending) */}
      {isPending && (
        <PMBox p={4} borderWidth="1px" borderRadius="md">
          <PMVStack align="stretch" gap={4}>
            <PMHeading size="sm">Review Actions</PMHeading>

            <PMBox>
              <PMText mb={2}>
                Review Notes (optional for accept, required for reject):
              </PMText>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add your review notes here..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </PMBox>

            <PMHStack gap={2}>
              <PMButton
                colorScheme="green"
                onClick={handleAccept}
                loading={acceptMutation.isPending}
              >
                Accept Patch
              </PMButton>
              <PMButton
                colorScheme="red"
                onClick={handleReject}
                loading={rejectMutation.isPending}
              >
                Reject Patch
              </PMButton>
            </PMHStack>
          </PMVStack>
        </PMBox>
      )}
    </PMVStack>
  );
};
