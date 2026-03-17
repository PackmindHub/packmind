import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { LuFile } from 'react-icons/lu';
import {
  PMAccordion,
  PMBox,
  PMHStack,
  PMIcon,
  PMMarkdownViewer,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  ChangeProposalId,
  SkillCreationProposalOverview,
  SkillFileId,
  SkillId,
} from '@packmind/types';
import { PREVIEW_SKILL_VERSION_ID } from '../../utils/changeProposalHelpers';
import { routes } from '../../../../shared/utils/routes';
import { useCreationReviewDetail } from '../../hooks/useCreationReviewDetail';
import { useUserLookup } from '../../hooks/useUserLookup';
import { SubmissionBanner } from '../SubmissionBanner';
import { CreationReviewHeader } from '../shared/CreationReviewHeader';
import { ProposalMessage } from '../shared/ProposalMessage';
import {
  ProposalDetailEmpty,
  ProposalDetailLoading,
} from '../ProposalDetailPlaceholder';
import { FileContent } from '../SkillReviewDetail/FileItems/FileContent';

interface CreateSkillReviewDetailProps {
  proposalId: ChangeProposalId;
  orgSlug?: string;
  spaceSlug?: string;
}

export function CreateSkillReviewDetail({
  proposalId,
  orgSlug: orgSlugProp,
  spaceSlug: spaceSlugProp,
}: Readonly<CreateSkillReviewDetailProps>) {
  const {
    displayedProposal,
    submittedState,
    handleAccept,
    handleReject,
    isPending,
    isLoading,
  } = useCreationReviewDetail<SkillCreationProposalOverview>({
    proposalId,
    orgSlugProp,
    spaceSlugProp,
    filter: (c): c is SkillCreationProposalOverview =>
      c.artefactType === 'skills',
    getAcceptUrl: (_response, orgSlug, spaceSlug) =>
      routes.space.toSkills(orgSlug, spaceSlug),
  });

  const userLookup = useUserLookup();
  const [searchParams] = useSearchParams();
  const fileFilter = searchParams.get('file') ?? '';

  const allFiles = useMemo(() => {
    const skillMdFile = {
      path: 'SKILL.md',
      content: displayedProposal?.payload?.prompt ?? '',
      isBase64: false,
    };

    const otherFiles = displayedProposal?.payload?.files
      ? [...displayedProposal.payload.files]
          .filter((f) => f.path !== 'SKILL.md')
          .sort((a, b) => a.path.localeCompare(b.path))
      : [];

    return [skillMdFile, ...otherFiles];
  }, [displayedProposal?.payload?.files, displayedProposal?.payload?.prompt]);

  const filteredFiles = useMemo(() => {
    if (!fileFilter) return allFiles;
    if (fileFilter === '/SKILL.md')
      return allFiles.filter((f) => f.path === 'SKILL.md');
    return allFiles.filter(
      (f) => f.path === fileFilter || f.path.startsWith(fileFilter + '/'),
    );
  }, [allFiles, fileFilter]);

  const hasInfoFields = useMemo(
    () =>
      Boolean(
        displayedProposal?.payload?.license ||
        displayedProposal?.payload?.compatibility ||
        displayedProposal?.payload?.allowedTools ||
        (displayedProposal?.payload?.metadata &&
          Object.keys(displayedProposal.payload.metadata).length > 0),
      ),
    [displayedProposal],
  );

  const showDescription = !fileFilter || fileFilter === '/SKILL.md';

  const defaultExpandedValues = useMemo(
    () => allFiles.map((f) => f.path),
    [allFiles],
  );

  const getPreviewCommand = useCallback(() => {
    if (!displayedProposal) {
      return { recipeVersions: [], standardVersions: [], skillVersions: [] };
    }
    return {
      recipeVersions: [],
      standardVersions: [],
      skillVersions: [
        {
          id: PREVIEW_SKILL_VERSION_ID,
          skillId: 'preview' as SkillId,
          version: 1,
          userId: displayedProposal.createdBy,
          name: displayedProposal.payload.name,
          slug: displayedProposal.payload.name
            .toLowerCase()
            .replace(/\s+/g, '-'),
          description: displayedProposal.payload.description,
          prompt: displayedProposal.payload.prompt,
          license: displayedProposal.payload.license,
          compatibility: displayedProposal.payload.compatibility,
          metadata: displayedProposal.payload.metadata,
          allowedTools: displayedProposal.payload.allowedTools,
          files: (displayedProposal.payload.files ?? []).map((f, i) => ({
            ...f,
            id: `file-${i}` as SkillFileId,
            skillVersionId: PREVIEW_SKILL_VERSION_ID,
          })),
        },
      ],
    };
  }, [displayedProposal]);

  if (isLoading && !displayedProposal) {
    return <ProposalDetailLoading />;
  }

  if (!displayedProposal) {
    return <ProposalDetailEmpty />;
  }

  const authorName =
    userLookup.get(displayedProposal.createdBy) ?? 'Unknown user';

  return (
    <PMBox gridColumn="span 2" overflowY="auto">
      <CreationReviewHeader
        artefactName={displayedProposal.payload.name}
        latestAuthor={authorName}
        latestTime={new Date(displayedProposal.lastContributedAt)}
        onAccept={() => handleAccept(displayedProposal.payload)}
        onDismiss={handleReject}
        isPending={isPending}
        isSubmitted={!!submittedState}
        getPreviewCommand={getPreviewCommand}
      />
      <PMBox
        px={6}
        py={2}
        border="sm"
        borderTop="none"
        borderColor="border.tertiary"
      >
        <ProposalMessage message={displayedProposal.message} />
      </PMBox>
      <PMVStack gap={6} align="stretch" p={6}>
        {submittedState && (
          <SubmissionBanner
            submittedState={submittedState}
            artefactLabel="skill"
          />
        )}

        {showDescription && (
          <PMVStack
            align="stretch"
            gap={2}
            border="solid 1px"
            borderColor="border.tertiary"
            borderRadius="md"
            p={4}
          >
            <PMVStack gap={2} align="flex-start">
              <PMText color="secondary" fontSize="sm">
                Description:
              </PMText>
              <PMMarkdownViewer
                content={displayedProposal.payload.description}
              />
            </PMVStack>
            {hasInfoFields && (
              <>
                <PMSeparator my={2} borderColor="border.tertiary" />
                {displayedProposal.payload.license && (
                  <PMHStack gap={2}>
                    <PMText color="secondary" fontSize="sm">
                      License:
                    </PMText>
                    <PMText fontSize="sm">
                      {displayedProposal.payload.license}
                    </PMText>
                  </PMHStack>
                )}
                {displayedProposal.payload.compatibility && (
                  <PMHStack gap={2}>
                    <PMText color="secondary" fontSize="sm">
                      Compatibility:
                    </PMText>
                    <PMText fontSize="sm">
                      {displayedProposal.payload.compatibility}
                    </PMText>
                  </PMHStack>
                )}
                {displayedProposal.payload.allowedTools && (
                  <PMHStack gap={2}>
                    <PMText color="secondary" fontSize="sm">
                      Allowed Tools:
                    </PMText>
                    <PMText fontSize="sm">
                      {displayedProposal.payload.allowedTools}
                    </PMText>
                  </PMHStack>
                )}
                {displayedProposal.payload.metadata &&
                  Object.keys(displayedProposal.payload.metadata).length >
                    0 && (
                    <PMVStack gap={1} align="stretch">
                      <PMText color="secondary" fontSize="sm">
                        Metadata:
                      </PMText>
                      <PMVStack gap={1} pl={4} align="flex-start">
                        {Object.entries(displayedProposal.payload.metadata).map(
                          ([key, value]) => (
                            <PMHStack key={key} gap={2}>
                              <PMText color="secondary" fontSize="sm">
                                - {key}:
                              </PMText>
                              <PMText fontSize="sm">{value}</PMText>
                            </PMHStack>
                          ),
                        )}
                      </PMVStack>
                    </PMVStack>
                  )}
              </>
            )}
          </PMVStack>
        )}

        {filteredFiles.length > 0 && (
          <PMAccordion.Root
            collapsible
            multiple
            width="full"
            defaultValue={defaultExpandedValues}
          >
            <PMVStack gap={4} width="full">
              {filteredFiles.map((file) => (
                <PMAccordion.Item
                  key={file.path}
                  value={file.path}
                  width="full"
                  border="none"
                >
                  <PMAccordion.ItemTrigger cursor="pointer" padding={0}>
                    <PMBox
                      width="full"
                      bg="bg.panel"
                      borderRadius="md"
                      px={4}
                      py={2}
                      css={{
                        '[data-state=open] &': {
                          borderBottomRadius: 0,
                        },
                      }}
                    >
                      <PMHStack
                        gap={3}
                        alignItems="center"
                        justifyContent="flex-start"
                      >
                        <PMIcon color="text.faded">
                          <LuFile />
                        </PMIcon>
                        <PMText
                          fontSize="sm"
                          fontWeight="semibold"
                          color="faded"
                        >
                          {file.path}
                        </PMText>
                      </PMHStack>
                    </PMBox>
                  </PMAccordion.ItemTrigger>
                  <PMAccordion.ItemContent>
                    <PMBox
                      p={2}
                      border="sm"
                      borderBottomRadius="sm"
                      borderTop="none"
                      borderColor="border.tertiary"
                    >
                      <FileContent file={file} />
                    </PMBox>
                  </PMAccordion.ItemContent>
                </PMAccordion.Item>
              ))}
            </PMVStack>
          </PMAccordion.Root>
        )}
      </PMVStack>
    </PMBox>
  );
}
