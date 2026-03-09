import { useState, useCallback, useMemo } from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMLink,
  PMIcon,
  PMSeparator,
  PMBox,
  PMHStack,
  PMButton,
  PMMenu,
  PMPortal,
  PMText,
  PMAvatar,
  PMHeading,
  PMBadge,
  PMVStack,
  PMFlex,
  PMSegmentGroup,
  PMAccordion,
  PMTreeView,
  PMTreeViewBranchIndentGuide,
  createFileTreeCollection,
} from '@packmind/ui';
import { Grid } from '@chakra-ui/react';
import {
  LuHouse,
  LuSettings,
  LuWrench,
  LuCircleHelp,
  LuBuilding,
  LuBook,
  LuMessageCircleQuestion,
  LuUsersRound,
  LuLogOut,
  LuCheck,
  LuX,
  LuUndo2,
  LuChevronDown,
  LuChevronRight,
  LuFile,
  LuFolder,
} from 'react-icons/lu';

// ============================================================
// Types (local to playground)
// ============================================================

type ArtefactType = 'standard' | 'command' | 'skill';
type ProposalStatus = 'pending' | 'accepted' | 'rejected';

interface StubProposal {
  id: string;
  field: string;
  summary: string;
  status: ProposalStatus;
  type: 'add' | 'update' | 'delete';
  /** For skills: file path this proposal belongs to */
  filePath?: string;
}

interface StubGroupArtefact {
  id: string;
  name: string;
  artefactType: ArtefactType;
  proposals: StubProposal[];
}

interface StubGroup {
  id: string;
  message: string;
  author: string;
  createdAt: string;
  artefacts: StubGroupArtefact[];
}

// ============================================================
// Stub data
// ============================================================

const STUB_GROUPS: StubGroup[] = [
  {
    id: 'g1',
    message: 'Add authentication standards',
    author: 'joan',
    createdAt: '2 hours ago',
    artefacts: [
      {
        id: 'a1',
        name: 'Naming conventions',
        artefactType: 'standard',
        proposals: [
          {
            id: 'p1',
            field: 'Rules',
            summary: 'Add rule: "Use camelCase for variable names"',
            status: 'pending',
            type: 'add',
          },
          {
            id: 'p2',
            field: 'Description',
            summary: 'Update description to mention auth context',
            status: 'pending',
            type: 'update',
          },
        ],
      },
      {
        id: 'a2',
        name: 'Error handling',
        artefactType: 'standard',
        proposals: [
          {
            id: 'p3',
            field: 'Rules',
            summary: 'Add rule: "Always wrap async calls in try/catch"',
            status: 'pending',
            type: 'add',
          },
        ],
      },
      {
        id: 'a3',
        name: 'Deploy to staging',
        artefactType: 'command',
        proposals: [
          {
            id: 'p4',
            field: 'Name',
            summary: 'Rename to "Deploy to staging environment"',
            status: 'pending',
            type: 'update',
          },
          {
            id: 'p5',
            field: 'Description',
            summary: 'Update description with auth prerequisites',
            status: 'pending',
            type: 'update',
          },
        ],
      },
    ],
  },
  {
    id: 'g2',
    message: 'Refactor deploy commands',
    author: 'alex',
    createdAt: '1 day ago',
    artefacts: [
      {
        id: 'a4',
        name: 'Deploy to production',
        artefactType: 'command',
        proposals: [
          {
            id: 'p6',
            field: 'Description',
            summary: 'Clarify rollback steps',
            status: 'pending',
            type: 'update',
          },
          {
            id: 'p7',
            field: 'Steps',
            summary: 'Add pre-deployment health check step',
            status: 'pending',
            type: 'add',
          },
        ],
      },
    ],
  },
  {
    id: 'g3',
    message: 'New code review skill',
    author: 'joan',
    createdAt: '3 days ago',
    artefacts: [
      {
        id: 'a5',
        name: 'PR review assistant',
        artefactType: 'skill',
        proposals: [
          {
            id: 'p8',
            field: 'Prompt',
            summary: 'Update prompt with security checklist',
            status: 'pending',
            type: 'update',
            filePath: 'SKILL.md',
          },
          {
            id: 'p9',
            field: 'Files',
            summary: 'Add review-checklist.md template',
            status: 'pending',
            type: 'add',
            filePath: 'templates/review-checklist.md',
          },
          {
            id: 'p10',
            field: 'Metadata',
            summary: 'Update compatibility to include Cursor',
            status: 'pending',
            type: 'update',
            filePath: 'SKILL.md',
          },
          {
            id: 'p11',
            field: 'Description',
            summary: 'Expand description for discoverability',
            status: 'pending',
            type: 'update',
            filePath: 'SKILL.md',
          },
          {
            id: 'p13',
            field: 'Files',
            summary: 'Update security rules configuration',
            status: 'pending',
            type: 'update',
            filePath: 'config/security-rules.json',
          },
          {
            id: 'p14',
            field: 'Files',
            summary: 'Add helper script for lint integration',
            status: 'pending',
            type: 'add',
            filePath: 'scripts/lint-helper.sh',
          },
        ],
      },
      {
        id: 'a6',
        name: 'Testing conventions',
        artefactType: 'standard',
        proposals: [
          {
            id: 'p12',
            field: 'Rules',
            summary: 'Add rule: "Each test file must have a describe block"',
            status: 'pending',
            type: 'add',
          },
        ],
      },
    ],
  },
];

// ============================================================
// Helpers
// ============================================================

const ARTEFACT_TYPE_LABEL: Record<ArtefactType, string> = {
  standard: 'Standard',
  command: 'Command',
  skill: 'Skill',
};

function proposalCountForGroup(group: StubGroup): number {
  return group.artefacts.reduce((sum, a) => sum + a.proposals.length, 0);
}

// ============================================================
// Small shared components
// ============================================================

function NavBadge({ children }: { children: React.ReactNode }) {
  return (
    <PMFlex
      alignItems="center"
      justifyContent="center"
      bg="yellow.800"
      color="yellow.200"
      borderRadius="full"
      minWidth="24px"
      height="24px"
      fontSize="xs"
      fontWeight="bold"
      flexShrink={0}
      px={1}
    >
      {children}
    </PMFlex>
  );
}

// ============================================================
// StatusDot — mirrors StatusDot.tsx
// ============================================================

const STATUS_DOT_COLOR: Record<ProposalStatus, string> = {
  pending: 'yellow.400',
  accepted: 'green.400',
  rejected: 'red.400',
};

function StatusDot({ status }: { status: ProposalStatus }) {
  return (
    <PMBox
      width="10px"
      height="10px"
      borderRadius="full"
      flexShrink={0}
      bg={STATUS_DOT_COLOR[status]}
    />
  );
}

// ============================================================
// MultiSegmentProgressBar — mirrors MultiSegmentProgressBar.tsx
// ============================================================

function MultiSegmentProgressBar({
  segments,
}: {
  segments: { count: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) return null;

  return (
    <PMHStack
      gap={0}
      width="full"
      height="6px"
      borderRadius="full"
      overflow="hidden"
    >
      {segments
        .filter((seg) => seg.count > 0)
        .map((seg, i) => (
          <PMBox key={i} bg={seg.color} flex={seg.count} height="full" />
        ))}
    </PMHStack>
  );
}

// ============================================================
// ChangesSummaryBar — mirrors ChangesSummaryBar.tsx
// ============================================================

function ChangesSummaryBar({
  totalCount,
  pendingCount,
  acceptedCount,
  dismissedCount,
}: {
  totalCount: number;
  pendingCount: number;
  acceptedCount: number;
  dismissedCount: number;
}) {
  const segments = [
    { count: acceptedCount, color: 'green.400' },
    { count: dismissedCount, color: 'red.400' },
    { count: pendingCount, color: 'yellow.400' },
  ];

  return (
    <PMBox px={6} py={3} my={2}>
      <PMHStack justifyContent="space-between" mb={2}>
        <PMHStack gap={3} fontSize="sm">
          <PMText>
            {totalCount} change{totalCount !== 1 ? 's' : ''}
          </PMText>
          <PMHStack gap={1} alignItems="center">
            <PMBox
              width="8px"
              height="8px"
              borderRadius="full"
              bg="yellow.400"
            />
            <PMText>{pendingCount} pending</PMText>
          </PMHStack>
          <PMHStack gap={1} alignItems="center">
            <PMBox
              width="8px"
              height="8px"
              borderRadius="full"
              bg="green.400"
            />
            <PMText>{acceptedCount} accepted</PMText>
          </PMHStack>
          <PMHStack gap={1} alignItems="center">
            <PMBox width="8px" height="8px" borderRadius="full" bg="red.400" />
            <PMText>{dismissedCount} dismissed</PMText>
          </PMHStack>
        </PMHStack>
      </PMHStack>
      <MultiSegmentProgressBar segments={segments} />
    </PMBox>
  );
}

// ============================================================
// ReviewedSectionDivider — mirrors ReviewedSectionDivider.tsx
// ============================================================

function ReviewedSectionDivider({ count }: { count: number }) {
  return (
    <PMBox display="flex" alignItems="center" gap={3} py={2}>
      <PMBox flex={1} height="1px" bg="border.tertiary" />
      <PMText fontSize="xs" fontWeight="semibold" color="secondary">
        Reviewed ({count})
      </PMText>
      <PMBox flex={1} height="1px" bg="border.tertiary" />
    </PMBox>
  );
}

// ============================================================
// CardActions — mirrors CardActions.tsx
// ============================================================

function CardActions({
  poolStatus,
  onAccept,
  onDismiss,
  onUndo,
}: {
  poolStatus: ProposalStatus;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  if (poolStatus !== 'pending') {
    return (
      <PMButton size="sm" variant="ghost" onClick={onUndo}>
        <LuUndo2 />
        Undo
      </PMButton>
    );
  }

  return (
    <PMHStack gap={2}>
      <PMButton
        size="xs"
        variant="outline"
        onClick={onAccept}
        color="green.300"
        borderColor="green.300"
      >
        <LuCheck />
        Accept
      </PMButton>
      <PMButton
        size="xs"
        variant="outline"
        onClick={onDismiss}
        color="red.300"
        borderColor="red.300"
      >
        <LuX />
        Dismiss
      </PMButton>
    </PMHStack>
  );
}

// ============================================================
// ProposalAccordionList — mirrors ChangeProposalAccordion.tsx
// Accordion with expandable proposal cards, summary bar, reviewed divider
// ============================================================

function ProposalAccordionList({
  proposals,
  proposalStatuses,
  onUpdateStatus,
}: {
  proposals: StubProposal[];
  proposalStatuses: Record<string, ProposalStatus>;
  onUpdateStatus: (proposalId: string, status: ProposalStatus) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    proposals.length > 0 ? [proposals[0].id] : [],
  );

  const withStatus = proposals.map((p) => ({
    ...p,
    status: proposalStatuses[p.id] ?? p.status,
  }));
  const pending = withStatus.filter((p) => p.status === 'pending');
  const reviewed = withStatus.filter((p) => p.status !== 'pending');

  return (
    <PMBox>
      <ChangesSummaryBar
        totalCount={withStatus.length}
        pendingCount={pending.length}
        acceptedCount={withStatus.filter((p) => p.status === 'accepted').length}
        dismissedCount={
          withStatus.filter((p) => p.status === 'rejected').length
        }
      />
      <PMBox px={6} pb={6}>
        <PMAccordion.Root
          collapsible
          multiple
          value={expandedIds}
          onValueChange={(details) => setExpandedIds(details.value)}
        >
          <PMVStack gap={3} width="full">
            {pending.map((p) => (
              <ProposalAccordionCard
                key={p.id}
                proposal={p}
                number={proposals.indexOf(p) + 1}
                onAccept={() => onUpdateStatus(p.id, 'accepted')}
                onDismiss={() => onUpdateStatus(p.id, 'rejected')}
                onUndo={() => onUpdateStatus(p.id, 'pending')}
              />
            ))}
            {reviewed.length > 0 && (
              <>
                <ReviewedSectionDivider count={reviewed.length} />
                {reviewed.map((p) => (
                  <ProposalAccordionCard
                    key={p.id}
                    proposal={p}
                    number={proposals.indexOf(p) + 1}
                    onAccept={() => onUpdateStatus(p.id, 'accepted')}
                    onDismiss={() => onUpdateStatus(p.id, 'rejected')}
                    onUndo={() => onUpdateStatus(p.id, 'pending')}
                  />
                ))}
              </>
            )}
          </PMVStack>
        </PMAccordion.Root>
      </PMBox>
    </PMBox>
  );
}

// ============================================================
// SkillGroupedAccordionList — mirrors SkillGroupedAccordion.tsx
// Groups proposals by file path, with file headers
// ============================================================

interface FileGroup {
  filePath: string;
  proposals: StubProposal[];
}

function groupProposalsByFile(proposals: StubProposal[]): FileGroup[] {
  const groups = new Map<string, StubProposal[]>();
  for (const p of proposals) {
    const path = p.filePath ?? 'SKILL.md';
    const existing = groups.get(path);
    if (existing) {
      existing.push(p);
    } else {
      groups.set(path, [p]);
    }
  }
  // SKILL.md first, then alphabetically
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'SKILL.md') return -1;
      if (b === 'SKILL.md') return 1;
      return a.localeCompare(b);
    })
    .map(([filePath, fileProposals]) => ({
      filePath,
      proposals: fileProposals,
    }));
}

function getUniqueFilePaths(proposals: StubProposal[]): string[] {
  const paths = new Set(proposals.map((p) => p.filePath ?? 'SKILL.md'));
  return Array.from(paths).sort((a, b) => {
    if (a === 'SKILL.md') return -1;
    if (b === 'SKILL.md') return 1;
    return a.localeCompare(b);
  });
}

function FileGroupHeader({
  filePath,
  changeCount,
  pendingCount,
}: {
  filePath: string;
  changeCount: number;
  pendingCount: number;
}) {
  return (
    <PMBox
      width="full"
      bg="bg.panel"
      borderRadius="md"
      px={4}
      py={2}
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <PMHStack gap={3} alignItems="center" justifyContent="flex-start">
        <PMIcon color="text.faded">
          <LuFile />
        </PMIcon>
        <PMText fontSize="sm" fontWeight="semibold" color="faded">
          {filePath}
        </PMText>
        <PMText fontSize="xs" color="faded">
          {changeCount} change{changeCount !== 1 ? 's' : ''}
        </PMText>
        {pendingCount > 0 && (
          <PMBadge colorPalette="yellow" variant="subtle" size="sm">
            {pendingCount} pending
          </PMBadge>
        )}
      </PMHStack>
    </PMBox>
  );
}

function SkillGroupedAccordionList({
  proposals,
  proposalStatuses,
  onUpdateStatus,
  fileFilter,
}: {
  proposals: StubProposal[];
  proposalStatuses: Record<string, ProposalStatus>;
  onUpdateStatus: (proposalId: string, status: ProposalStatus) => void;
  fileFilter: string | null;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    proposals.length > 0 ? [proposals[0].id] : [],
  );

  const filteredProposals = fileFilter
    ? proposals.filter((p) => (p.filePath ?? 'SKILL.md') === fileFilter)
    : proposals;

  const withStatus = filteredProposals.map((p) => ({
    ...p,
    status: proposalStatuses[p.id] ?? p.status,
  }));

  const pending = withStatus.filter((p) => p.status === 'pending');
  const reviewed = withStatus.filter((p) => p.status !== 'pending');

  const pendingFileGroups = groupProposalsByFile(pending);
  const reviewedFileGroups = groupProposalsByFile(reviewed);

  return (
    <PMBox>
      <ChangesSummaryBar
        totalCount={withStatus.length}
        pendingCount={pending.length}
        acceptedCount={withStatus.filter((p) => p.status === 'accepted').length}
        dismissedCount={
          withStatus.filter((p) => p.status === 'rejected').length
        }
      />
      <PMBox px={6} pb={6}>
        <PMAccordion.Root
          collapsible
          multiple
          value={expandedIds}
          onValueChange={(details) => setExpandedIds(details.value)}
        >
          <PMVStack gap={3} width="full">
            {pendingFileGroups.map((group) => (
              <PMBox key={group.filePath} width="full">
                <FileGroupHeader
                  filePath={group.filePath}
                  changeCount={group.proposals.length}
                  pendingCount={group.proposals.length}
                />
                <PMVStack gap={3} mt={3}>
                  {group.proposals.map((p) => (
                    <ProposalAccordionCard
                      key={p.id}
                      proposal={p}
                      number={filteredProposals.indexOf(p) + 1}
                      onAccept={() => onUpdateStatus(p.id, 'accepted')}
                      onDismiss={() => onUpdateStatus(p.id, 'rejected')}
                      onUndo={() => onUpdateStatus(p.id, 'pending')}
                    />
                  ))}
                </PMVStack>
              </PMBox>
            ))}
            {reviewedFileGroups.length > 0 && (
              <>
                <ReviewedSectionDivider count={reviewed.length} />
                {reviewedFileGroups.map((group) => (
                  <PMBox key={group.filePath} width="full">
                    <FileGroupHeader
                      filePath={group.filePath}
                      changeCount={group.proposals.length}
                      pendingCount={0}
                    />
                    <PMVStack gap={3} mt={3}>
                      {group.proposals.map((p) => (
                        <ProposalAccordionCard
                          key={p.id}
                          proposal={p}
                          number={filteredProposals.indexOf(p) + 1}
                          onAccept={() => onUpdateStatus(p.id, 'accepted')}
                          onDismiss={() => onUpdateStatus(p.id, 'rejected')}
                          onUndo={() => onUpdateStatus(p.id, 'pending')}
                        />
                      ))}
                    </PMVStack>
                  </PMBox>
                ))}
              </>
            )}
          </PMVStack>
        </PMAccordion.Root>
      </PMBox>
    </PMBox>
  );
}

// ============================================================
// ProposalAccordionCard — mirrors ChangeProposalCard.tsx
// ============================================================

const FIELD_LABEL: Record<string, string> = {
  Rules: 'Rule',
  Description: 'Description',
  Name: 'Name',
  Steps: 'Steps',
  Prompt: 'Prompt',
  Files: 'Files',
  Metadata: 'Metadata',
};

function ProposalAccordionCard({
  proposal,
  number,
  onAccept,
  onDismiss,
  onUndo,
}: {
  proposal: StubProposal;
  number: number;
  onAccept: () => void;
  onDismiss: () => void;
  onUndo: () => void;
}) {
  return (
    <PMAccordion.Item
      value={proposal.id}
      border="1px solid"
      borderColor="border.tertiary"
      borderRadius="md"
      width="full"
    >
      {/* Card header — mirrors ChangeProposalCardHeader */}
      <PMAccordion.ItemTrigger px={4} py={3} _hover={{ cursor: 'pointer' }}>
        <PMHStack flex={1} gap={3} alignItems="center">
          <PMAccordion.ItemIndicator />
          <PMText fontWeight="medium" fontSize="sm">
            #{number} &mdash; {FIELD_LABEL[proposal.field] ?? proposal.field}
          </PMText>
          <StatusDot status={proposal.status} />
          <PMHStack flex={1} justifyContent="flex-end">
            <PMText fontSize="xs" color="secondary">
              joan &middot; 2h ago &middot;
            </PMText>
            <PMBadge size="sm" colorPalette="gray">
              base v1
            </PMBadge>
          </PMHStack>
        </PMHStack>
      </PMAccordion.ItemTrigger>

      {/* Card body — mirrors ChangeProposalCardBody */}
      <PMAccordion.ItemContent>
        <PMVStack gap={0} alignItems="stretch">
          {/* Toolbar */}
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <PMHStack justifyContent="space-between" alignItems="center">
              <PMHStack gap={2} alignItems="center">
                <PMSegmentGroup.Root size="sm" defaultValue="diff">
                  <PMSegmentGroup.Indicator bg="background.tertiary" />
                  {[
                    { label: 'Diff', value: 'diff' },
                    { label: 'Inline', value: 'inline' },
                  ].map((item) => (
                    <PMSegmentGroup.Item
                      key={item.value}
                      value={item.value}
                      _checked={{ color: 'text.primary' }}
                    >
                      <PMSegmentGroup.ItemText>
                        {item.label}
                      </PMSegmentGroup.ItemText>
                      <PMSegmentGroup.ItemHiddenInput />
                    </PMSegmentGroup.Item>
                  ))}
                </PMSegmentGroup.Root>
              </PMHStack>
              <CardActions
                poolStatus={proposal.status}
                onAccept={onAccept}
                onDismiss={onDismiss}
                onUndo={onUndo}
              />
            </PMHStack>
          </PMVStack>

          {/* Diff content placeholder */}
          <PMSeparator borderColor="border.tertiary" />
          <PMVStack p={4} alignItems="stretch">
            <PMBox
              bg="{colors.background.secondary}"
              borderRadius="md"
              p={4}
              fontFamily="mono"
              fontSize="sm"
            >
              <PMText color="secondary">{proposal.summary}</PMText>
            </PMBox>
          </PMVStack>
        </PMVStack>
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}

// ============================================================
// SkillFileFilterTree — mirrors SkillFileTree.tsx
// Tree view with SKILL.md first, then other files in folders
// ============================================================

const SKILL_MD_PATH = 'SKILL.md';

const getParentFolders = (filePath: string): string[] => {
  const parts = filePath.split('/');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
};

function SkillFileFilterTree({
  filePaths,
  selectedFilePath,
  onFileSelect,
}: {
  filePaths: string[];
  selectedFilePath: string | null;
  onFileSelect: (path: string | null) => void;
}) {
  const hasSkillMd = filePaths.includes(SKILL_MD_PATH);
  const otherPaths = filePaths.filter((p) => p !== SKILL_MD_PATH);
  const hasOtherFiles = otherPaths.length > 0;

  const otherCollection = useMemo(
    () => createFileTreeCollection(otherPaths),
    [otherPaths],
  );

  const [expandedValue, setExpandedValue] = useState<string[]>(() => {
    // Auto-expand all parent folders
    const allFolders = new Set<string>();
    for (const p of otherPaths) {
      for (const folder of getParentFolders(p)) {
        allFolders.add(folder);
      }
    }
    return Array.from(allFolders);
  });

  const handleSelectionChange = (details: {
    selectedValue: string[];
    selectedNodes: { children?: unknown[] }[];
  }) => {
    const selectedNode = details.selectedNodes[0];
    const selectedValue = details.selectedValue[0];
    const isFile = !selectedNode?.children?.length;
    if (isFile && selectedValue) {
      onFileSelect(selectedValue);
    }
  };

  return (
    <PMBox px={3} pt={2}>
      <PMText fontSize="xs" fontWeight="bold" color="secondary" mb={2} px={2}>
        FILES
      </PMText>

      {/* "All files" option */}
      <PMBox
        cursor="pointer"
        onClick={() => onFileSelect(null)}
        px={2}
        py={1}
        borderRadius="sm"
        bg={
          selectedFilePath === null
            ? '{colors.background.secondary}'
            : undefined
        }
        _hover={{ bg: '{colors.background.secondary}' }}
        mb={1}
      >
        <PMText
          fontSize="sm"
          fontWeight={selectedFilePath === null ? 'bold' : 'normal'}
        >
          All files
        </PMText>
      </PMBox>

      <PMSeparator borderColor="border.secondary" my={1} />

      {/* SKILL.md — principal file */}
      {hasSkillMd && (
        <PMTreeView.Root
          collection={createFileTreeCollection([SKILL_MD_PATH])}
          selectionMode="single"
          selectedValue={
            selectedFilePath === SKILL_MD_PATH ? [SKILL_MD_PATH] : []
          }
          onSelectionChange={() => onFileSelect(SKILL_MD_PATH)}
          width="full"
          size="sm"
        >
          <PMTreeView.Tree>
            <PMTreeView.Node
              render={() => (
                <PMTreeView.Item>
                  <LuFile />
                  <PMTreeView.ItemText>{SKILL_MD_PATH}</PMTreeView.ItemText>
                </PMTreeView.Item>
              )}
            />
          </PMTreeView.Tree>
        </PMTreeView.Root>
      )}

      {/* Separator between SKILL.md and other files */}
      {hasSkillMd && hasOtherFiles && (
        <PMSeparator borderColor="border.secondary" width="full" />
      )}

      {/* Other files tree */}
      {hasOtherFiles && (
        <PMTreeView.Root
          collection={otherCollection}
          selectionMode="single"
          selectedValue={selectedFilePath ? [selectedFilePath] : []}
          onSelectionChange={handleSelectionChange}
          expandedValue={expandedValue}
          onExpandedChange={(details) =>
            setExpandedValue(details.expandedValue)
          }
          width="full"
          size="sm"
        >
          <PMTreeView.Tree>
            <PMTreeView.Node
              indentGuide={<PMTreeViewBranchIndentGuide />}
              render={({ node, nodeState }) => {
                if (nodeState.isBranch) {
                  return (
                    <PMTreeView.Branch>
                      <PMTreeView.BranchControl>
                        <PMTreeView.BranchIndicator>
                          <LuChevronRight />
                        </PMTreeView.BranchIndicator>
                        <PMIcon>
                          <LuFolder />
                        </PMIcon>
                        <PMTreeView.BranchText>
                          {node.label}
                        </PMTreeView.BranchText>
                      </PMTreeView.BranchControl>
                      <PMTreeView.BranchContent />
                    </PMTreeView.Branch>
                  );
                }

                return (
                  <PMTreeView.Item>
                    <LuFile />
                    <PMTreeView.ItemText>{node.label}</PMTreeView.ItemText>
                  </PMTreeView.Item>
                );
              }}
            />
          </PMTreeView.Tree>
        </PMTreeView.Root>
      )}
    </PMBox>
  );
}

// ============================================================
// Left sidebar: Review Changes sidebar with mode toggle
// ============================================================

type ReviewMode = 'artifact' | 'group';

function ReviewChangesSidebarPanel({
  mode,
  onModeChange,
  groups,
  selectedGroupId,
  onSelectGroup,
  selectedArtefactId,
  onSelectArtefact,
  selectedFilePath,
  onSelectFilePath,
}: {
  mode: ReviewMode;
  onModeChange: (mode: ReviewMode) => void;
  groups: StubGroup[];
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  selectedArtefactId: string | null;
  onSelectArtefact: (id: string) => void;
  selectedFilePath: string | null;
  onSelectFilePath: (path: string | null) => void;
}) {
  const allArtefacts = groups.flatMap((g) => g.artefacts);
  const selectedArtefact = allArtefacts.find(
    (a) => a.id === selectedArtefactId,
  );
  const isSkillSelected = selectedArtefact?.artefactType === 'skill';
  const skillFilePaths = isSkillSelected
    ? getUniqueFilePaths(selectedArtefact.proposals)
    : [];

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      {/* Mode toggle */}
      <PMBox px={3} pb={2} display="flex" justifyContent="center">
        <PMSegmentGroup.Root
          size="xs"
          value={mode}
          onValueChange={(e) => onModeChange(e.value as ReviewMode)}
        >
          <PMSegmentGroup.Indicator bg="background.tertiary" />
          {[
            { label: 'By artifact', value: 'artifact' },
            { label: 'By group', value: 'group' },
          ].map((item) => (
            <PMSegmentGroup.Item
              key={item.value}
              value={item.value}
              _checked={{ color: 'text.primary' }}
            >
              <PMSegmentGroup.ItemText>{item.label}</PMSegmentGroup.ItemText>
              <PMSegmentGroup.ItemHiddenInput />
            </PMSegmentGroup.Item>
          ))}
        </PMSegmentGroup.Root>
      </PMBox>

      {/* List content */}
      <PMBox flex={1} minH={0} overflowY="auto">
        {mode === 'artifact' ? (
          <>
            <PMVerticalNavSection
              title="CHANGES TO REVIEW"
              navEntries={allArtefacts.map((artefact) => (
                <PMBox
                  key={artefact.id}
                  borderBottom="1px solid"
                  borderColor="{colors.border.tertiary}"
                  cursor="pointer"
                  onClick={() => {
                    onSelectArtefact(artefact.id);
                    onSelectFilePath(null);
                  }}
                >
                  <PMLink
                    variant="navbar"
                    data-active={
                      selectedArtefactId === artefact.id ? 'true' : undefined
                    }
                    as="span"
                    display="flex"
                    alignItems="center"
                    width="full"
                    py={2}
                  >
                    <PMHStack
                      width="full"
                      justifyContent="space-between"
                      gap={2}
                      minW={0}
                    >
                      <PMVStack
                        gap={0}
                        flex={1}
                        minW={0}
                        alignItems="flex-start"
                      >
                        <PMText
                          fontSize="sm"
                          fontWeight={
                            selectedArtefactId === artefact.id
                              ? 'bold'
                              : 'medium'
                          }
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          maxW="100%"
                        >
                          {artefact.name}
                        </PMText>
                        <PMText fontSize="xs" opacity={0.5} fontWeight="normal">
                          {ARTEFACT_TYPE_LABEL[artefact.artefactType]}
                        </PMText>
                      </PMVStack>
                      <NavBadge>{artefact.proposals.length}</NavBadge>
                    </PMHStack>
                  </PMLink>
                </PMBox>
              ))}
            />
            {isSkillSelected && (
              <SkillFileFilterTree
                filePaths={skillFilePaths}
                selectedFilePath={selectedFilePath}
                onFileSelect={onSelectFilePath}
              />
            )}
          </>
        ) : (
          <PMVerticalNavSection
            title="GROUPS TO REVIEW"
            navEntries={groups.map((group) => (
              <PMBox
                key={group.id}
                borderBottom="1px solid"
                borderColor="{colors.border.tertiary}"
                cursor="pointer"
                onClick={() => onSelectGroup(group.id)}
              >
                <PMLink
                  variant="navbar"
                  data-active={
                    selectedGroupId === group.id ? 'true' : undefined
                  }
                  as="span"
                  display="block"
                  width="full"
                  py={2}
                >
                  <PMHStack
                    width="full"
                    justifyContent="space-between"
                    gap={2}
                    minW={0}
                  >
                    <PMVStack gap={0} flex={1} minW={0} alignItems="flex-start">
                      <PMText
                        fontSize="sm"
                        fontWeight={
                          selectedGroupId === group.id ? 'bold' : 'medium'
                        }
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        maxW="100%"
                      >
                        {group.message}
                      </PMText>
                      <PMText fontSize="xs" opacity={0.5} fontWeight="normal">
                        {group.author} &middot; {group.createdAt}
                      </PMText>
                    </PMVStack>
                    <NavBadge>{proposalCountForGroup(group)}</NavBadge>
                  </PMHStack>
                </PMLink>
              </PMBox>
            ))}
          />
        )}
      </PMBox>
    </PMVerticalNav>
  );
}

// ============================================================
// Detail panel: Group view (gridColumn="span 2")
// Sticky header + artefact sections with accordion proposal cards
// ============================================================

function GroupDetailPanel({
  group,
  proposalStatuses,
  onUpdateStatus,
}: {
  group: StubGroup;
  proposalStatuses: Record<string, ProposalStatus>;
  onUpdateStatus: (proposalId: string, status: ProposalStatus) => void;
}) {
  const [expandedArtefactIds, setExpandedArtefactIds] = useState<Set<string>>(
    () => new Set([group.artefacts[0]?.id]),
  );

  const toggleArtefact = useCallback((id: string) => {
    setExpandedArtefactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const totalProposals = proposalCountForGroup(group);
  const allProposals = group.artefacts.flatMap((a) => a.proposals);
  const acceptedCount = allProposals.filter(
    (p) => proposalStatuses[p.id] === 'accepted',
  ).length;
  const hasPooledDecisions = allProposals.some(
    (p) =>
      proposalStatuses[p.id] === 'accepted' ||
      proposalStatuses[p.id] === 'rejected',
  );

  return (
    <PMBox
      gridColumn="span 2"
      display="flex"
      flexDirection="column"
      height="full"
      overflowY="auto"
    >
      {/* Sticky header — mirrors ReviewHeader */}
      <PMBox
        position="sticky"
        top={0}
        zIndex={10}
        bg="bg.panel"
        borderBottom="1px solid"
        borderColor="border.tertiary"
        px={6}
        py={3}
      >
        <PMHStack justifyContent="space-between" alignItems="center">
          <PMVStack gap={0} alignItems="flex-start">
            <PMHeading size="md">{group.message}</PMHeading>
            <PMText fontSize="sm" color="tertiary">
              {group.author} &middot; {group.createdAt} &middot;{' '}
              {group.artefacts.length} artifact
              {group.artefacts.length !== 1 ? 's' : ''} &middot;{' '}
              {totalProposals} change{totalProposals !== 1 ? 's' : ''}
            </PMText>
          </PMVStack>
          <PMButton variant="primary" size="sm" disabled={!hasPooledDecisions}>
            Apply changes{acceptedCount > 0 ? ` (${acceptedCount})` : ''}
          </PMButton>
        </PMHStack>
      </PMBox>

      {/* Artefact sections */}
      <PMVStack gap={0} align="stretch">
        {group.artefacts.map((artefact) => {
          const isExpanded = expandedArtefactIds.has(artefact.id);
          const withStatus = artefact.proposals.map((p) => ({
            ...p,
            status: proposalStatuses[p.id] ?? p.status,
          }));
          const pendingCount = withStatus.filter(
            (p) => p.status === 'pending',
          ).length;

          return (
            <PMBox key={artefact.id}>
              {/* Artefact header row — same style as FileGroupHeader */}
              <PMBox
                width="full"
                bg="bg.panel"
                borderRadius="md"
                px={4}
                py={2}
                borderBottom="1px solid"
                borderColor="border.tertiary"
                cursor="pointer"
                onClick={() => toggleArtefact(artefact.id)}
                _hover={{ bg: '{colors.background.secondary}' }}
                transition="background 0.1s"
              >
                <PMHStack
                  gap={3}
                  alignItems="center"
                  justifyContent="flex-start"
                >
                  <PMIcon color="text.faded" fontSize="xs">
                    {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
                  </PMIcon>
                  <PMText fontSize="sm" fontWeight="semibold" color="faded">
                    {artefact.name}
                  </PMText>
                  <PMText fontSize="xs" color="faded">
                    {artefact.proposals.length} change
                    {artefact.proposals.length !== 1 ? 's' : ''}
                  </PMText>
                  {pendingCount > 0 && (
                    <PMBadge colorPalette="yellow" variant="subtle" size="sm">
                      {pendingCount} pending
                    </PMBadge>
                  )}
                </PMHStack>
              </PMBox>

              {/* Expanded: proposal accordion */}
              {isExpanded && (
                <ProposalAccordionList
                  proposals={artefact.proposals}
                  proposalStatuses={proposalStatuses}
                  onUpdateStatus={onUpdateStatus}
                />
              )}
            </PMBox>
          );
        })}
      </PMVStack>
    </PMBox>
  );
}

// ============================================================
// Detail panel: Artifact view (gridColumn="span 2")
// Same as existing review-changes: ReviewHeader + ChangeProposalAccordion
// ============================================================

function ArtefactDetailPanel({
  artefact,
  proposalStatuses,
  onUpdateStatus,
  fileFilter,
}: {
  artefact: StubGroupArtefact;
  proposalStatuses: Record<string, ProposalStatus>;
  onUpdateStatus: (proposalId: string, status: ProposalStatus) => void;
  fileFilter: string | null;
}) {
  const withStatus = artefact.proposals.map((p) => ({
    ...p,
    status: proposalStatuses[p.id] ?? p.status,
  }));
  const acceptedCount = withStatus.filter(
    (p) => p.status === 'accepted',
  ).length;
  const hasPooledDecisions = withStatus.some(
    (p) => p.status === 'accepted' || p.status === 'rejected',
  );

  return (
    <PMBox
      gridColumn="span 2"
      display="flex"
      flexDirection="column"
      height="full"
      overflowY="auto"
    >
      {/* Sticky header — mirrors ReviewHeader */}
      <PMBox
        position="sticky"
        top={0}
        zIndex={10}
        bg="bg.panel"
        borderBottom="1px solid"
        borderColor="border.tertiary"
        px={6}
        py={3}
      >
        <PMHStack justifyContent="space-between" alignItems="center">
          <PMHStack gap={2}>
            <PMVStack gap={0} alignItems="flex-start">
              <PMHeading size="md">{artefact.name}</PMHeading>
              <PMText fontSize="xs" color="tertiary">
                {ARTEFACT_TYPE_LABEL[artefact.artefactType]} &middot;{' '}
                {withStatus.length} change
                {withStatus.length !== 1 ? 's' : ''}
              </PMText>
            </PMVStack>
          </PMHStack>
          <PMButton variant="primary" size="sm" disabled={!hasPooledDecisions}>
            Apply changes{acceptedCount > 0 ? ` (${acceptedCount})` : ''}
          </PMButton>
        </PMHStack>
      </PMBox>

      {/* Proposal accordion — grouped by file for skills, flat for others */}
      {artefact.artefactType === 'skill' ? (
        <SkillGroupedAccordionList
          proposals={artefact.proposals}
          proposalStatuses={proposalStatuses}
          onUpdateStatus={onUpdateStatus}
          fileFilter={fileFilter}
        />
      ) : (
        <ProposalAccordionList
          proposals={artefact.proposals}
          proposalStatuses={proposalStatuses}
          onUpdateStatus={onUpdateStatus}
        />
      )}
    </PMBox>
  );
}

// ============================================================
// App sidebar nav link (no routing, visual only)
// ============================================================

function AppSidebarNavLink({
  label,
  icon,
  isActive = false,
  badge,
}: {
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  badge?: { text: string; colorScheme?: string };
}) {
  return (
    <PMLink
      variant="navbar"
      data-active={isActive ? 'true' : undefined}
      as="span"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      cursor="pointer"
    >
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {icon && <PMIcon mr={2}>{icon}</PMIcon>}
        {label}
      </span>
      {badge && (
        <PMBadge
          size="sm"
          colorScheme={badge.colorScheme || 'purple'}
          ml={2}
          fontSize="xs"
        >
          {badge.text}
        </PMBadge>
      )}
    </PMLink>
  );
}

// ============================================================
// Stub menus (org selector, account, help)
// ============================================================

function StubOrgSelector() {
  return (
    <PMMenu.Root positioning={{ placement: 'bottom-start' }}>
      <PMMenu.Trigger asChild>
        <PMButton
          variant="secondary"
          width="full"
          justifyContent="flex-start"
          paddingY="6"
          paddingX="2"
        >
          <PMHStack overflow="hidden">
            <PMIcon color="text.tertiary">
              <LuBuilding />
            </PMIcon>
            <PMBox
              maxWidth="full"
              textOverflow="ellipsis"
              overflow="hidden"
              color="text.secondary"
            >
              Acme Corp
            </PMBox>
          </PMHStack>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="other-org" cursor="pointer">
              <PMText color="secondary">Other Organization</PMText>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

function StubAccountMenu() {
  return (
    <PMMenu.Root positioning={{ placement: 'right-start' }}>
      <PMMenu.Trigger asChild>
        <PMButton
          variant="secondary"
          width="full"
          justifyContent="flex-start"
          paddingY="6"
          paddingX="2"
        >
          <PMAvatar.Root
            size="xs"
            backgroundColor="background.secondary"
            color="text.primary"
          >
            <PMAvatar.Fallback name="jane@acme.com" />
          </PMAvatar.Root>
          <PMBox maxWidth="full" textOverflow="ellipsis" overflow="hidden">
            jane@acme.com
          </PMBox>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="settings" cursor="pointer">
              <PMText color="secondary">
                <PMIcon marginRight={2}>
                  <LuSettings />
                </PMIcon>
                Account settings
              </PMText>
            </PMMenu.Item>
            <PMMenu.Separator borderColor="border.tertiary" />
            <PMMenu.Item value="sign-out" cursor="pointer">
              <PMText color="secondary">
                <PMIcon marginRight={2}>
                  <LuLogOut />
                </PMIcon>
                Sign out
              </PMText>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

function StubHelpMenu() {
  return (
    <PMMenu.Root positioning={{ placement: 'right-start' }}>
      <PMMenu.Trigger asChild>
        <PMLink variant="navbar" as="span" cursor="pointer">
          <PMIcon mr={2}>
            <LuCircleHelp />
          </PMIcon>
          Help
        </PMLink>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="chat" cursor="pointer">
              <PMIcon size="sm">
                <LuMessageCircleQuestion />
              </PMIcon>
              Chat
            </PMMenu.Item>
            <PMMenu.Item value="documentation" cursor="pointer">
              <PMIcon size="sm">
                <LuBook />
              </PMIcon>
              Documentation
            </PMMenu.Item>
            <PMMenu.Item value="slack" cursor="pointer">
              <PMIcon size="sm">
                <LuUsersRound />
              </PMIcon>
              Community Slack
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

// ============================================================
// Main prototype
// ============================================================

export default function ReviewChangesGroupViewPrototype() {
  const [reviewMode, setReviewMode] = useState<ReviewMode>('group');
  const [selectedGroupId, setSelectedGroupId] = useState(STUB_GROUPS[0].id);
  const [selectedArtefactId, setSelectedArtefactId] = useState<string | null>(
    STUB_GROUPS[0].artefacts[0].id,
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [proposalStatuses, setProposalStatuses] = useState<
    Record<string, ProposalStatus>
  >({});

  const selectedGroup = STUB_GROUPS.find((g) => g.id === selectedGroupId);
  const allArtefacts = STUB_GROUPS.flatMap((g) => g.artefacts);
  const selectedArtefact = allArtefacts.find(
    (a) => a.id === selectedArtefactId,
  );

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = STUB_GROUPS.find((g) => g.id === groupId);
    setSelectedArtefactId(group?.artefacts[0]?.id ?? null);
  };

  const handleUpdateProposalStatus = (
    proposalId: string,
    status: ProposalStatus,
  ) => {
    setProposalStatuses((prev) => ({ ...prev, [proposalId]: status }));
  };

  return (
    <PMHStack height="100%" gap={0} align="stretch">
      {/* App sidebar */}
      <PMVerticalNav
        headerNav={<StubOrgSelector />}
        footerNav={<StubAccountMenu />}
      >
        <PMVerticalNavSection
          navEntries={[
            <AppSidebarNavLink
              key="dashboard"
              label="Dashboard"
              icon={<LuHouse />}
            />,
          ]}
        />
        <PMVerticalNavSection
          title="Playbook"
          navEntries={[
            <AppSidebarNavLink key="standards" label="Standards" />,
            <AppSidebarNavLink key="commands" label="Commands" />,
            <AppSidebarNavLink key="skills" label="Skills" />,
            <AppSidebarNavLink
              key="review-changes"
              label="Review Changes"
              isActive
            />,
          ]}
        />
        <PMVerticalNavSection
          title="Distribution"
          navEntries={[
            <AppSidebarNavLink key="packages" label="Packages" />,
            <AppSidebarNavLink
              key="overview"
              label="Overview"
              badge={{ text: 'Enterprise', colorScheme: 'purple' }}
            />,
          ]}
        />
        <PMSeparator borderColor="border.tertiary" />
        <PMVerticalNavSection
          navEntries={[
            <AppSidebarNavLink
              key="setup"
              label="Integrations"
              icon={<LuWrench />}
            />,
            <AppSidebarNavLink
              key="settings"
              label="Settings"
              icon={<LuSettings />}
            />,
            <StubHelpMenu key="help" />,
          ]}
        />
      </PMVerticalNav>

      {/* Review changes content — same CSS grid as the real app */}
      <Grid
        flex="1"
        minHeight={0}
        gridTemplateColumns="minmax(240px, 270px) 1fr minmax(280px, 320px)"
        overflowX="auto"
      >
        {/* Column 1: Review changes sidebar with toggle */}
        <PMBox gridColumn="1" overflowY="auto">
          <ReviewChangesSidebarPanel
            mode={reviewMode}
            onModeChange={setReviewMode}
            groups={STUB_GROUPS}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            selectedArtefactId={selectedArtefactId}
            onSelectArtefact={setSelectedArtefactId}
            selectedFilePath={selectedFilePath}
            onSelectFilePath={setSelectedFilePath}
          />
        </PMBox>

        {/* Columns 2+3: Detail panel (span 2) */}
        {reviewMode === 'group' && selectedGroup && (
          <GroupDetailPanel
            key={selectedGroup.id}
            group={selectedGroup}
            proposalStatuses={proposalStatuses}
            onUpdateStatus={handleUpdateProposalStatus}
          />
        )}
        {reviewMode === 'artifact' && selectedArtefact && (
          <ArtefactDetailPanel
            key={selectedArtefact.id}
            artefact={selectedArtefact}
            proposalStatuses={proposalStatuses}
            onUpdateStatus={handleUpdateProposalStatus}
            fileFilter={selectedFilePath}
          />
        )}
      </Grid>
    </PMHStack>
  );
}
