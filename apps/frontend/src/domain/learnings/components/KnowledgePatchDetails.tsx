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
import { StandardPatchDiff } from './StandardPatchDiff';

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
  const isStandardUpdate =
    patch.patchType === KnowledgePatchType.UPDATE_STANDARD;

  // Parse original standard from diffOriginal for UPDATE_STANDARD patches
  const parseOriginalStandard = () => {
    if (!isStandardUpdate) return null;

    const lines = patch.diffOriginal.split('\n');
    const name = lines[0]?.replace('# ', '').trim() || '';
    const descriptionStart = 1;
    const rulesStart = lines.findIndex((l) => l.startsWith('## Rules'));
    const description = lines
      .slice(descriptionStart, rulesStart > 0 ? rulesStart : lines.length)
      .join('\n')
      .trim();

    const rules: Array<{ id: string; content: string }> = [];
    if (rulesStart > 0) {
      const ruleLines = lines.slice(rulesStart + 1);
      ruleLines.forEach((line) => {
        if (line.startsWith('- ')) {
          // Extract rule ID and content from format: "- [ruleId] content"
          const match = line.match(/^- \[([^\]]+)\] (.+)$/);
          if (match) {
            rules.push({
              id: match[1],
              content: match[2].trim(),
            });
          }
        }
      });
    }

    return { name, description, rules };
  };

  const originalStandard = parseOriginalStandard();

  return (
    <PMVStack align="stretch" gap={6}>
      {/* Status and Type Badges */}
      <PMHStack gap={2}>
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
        <PMBadge colorScheme="blue">{patch.patchType}</PMBadge>
      </PMHStack>

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

      {/* Content Preview */}
      <PMBox p={4} borderWidth="1px" borderRadius="md">
        <PMHeading size="sm" mb={4}>
          {isNewArtifact ? 'Proposed Content' : 'Changes Preview'}
        </PMHeading>
        {isNewArtifact ? (
          <MarkdownEditorProvider>
            <MarkdownEditor defaultValue={patch.diffModified} readOnly />
          </MarkdownEditorProvider>
        ) : isStandardUpdate && originalStandard && patch.proposedChanges ? (
          <StandardPatchDiff
            proposedChanges={
              patch.proposedChanges as unknown as {
                standardId: string;
                description?: string | null;
                rules: {
                  toKeep: string[];
                  toUpdate: Array<{ ruleId: string; newContent: string }>;
                  toDelete: string[];
                  toAdd: Array<{ content: string }>;
                };
                rationale: string;
              }
            }
            originalStandard={originalStandard}
          />
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
