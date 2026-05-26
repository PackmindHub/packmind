import { useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMStatus,
  PMSwitch,
  PMText,
  PMTextArea,
  PMVStack,
} from '@packmind/ui';
import {
  LuBot,
  LuCheck,
  LuMessageSquare,
  LuPin,
  LuPlug,
  LuRefreshCw,
  LuTerminal,
  LuWandSparkles,
  LuWebhook,
  LuX,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { getSpaceColorPalette } from '../spaceColor';
import type {
  Artifact,
  ArtifactKind,
  Suggestion,
  SuggestionComment,
} from '../types';

type SuggestionReviewPaneProps = {
  suggestion: Suggestion;
  onApprove: (policy: { mandatory: boolean; autoUpdate: boolean }) => void;
  onReject: (reason: string) => void;
  onRequestChanges: (body: string) => void;
};

const KIND_ICON: Record<ArtifactKind, IconType> = {
  command: LuTerminal,
  skill: LuWandSparkles,
  subagent: LuBot,
  hook: LuWebhook,
  'mcp-server': LuPlug,
};

const KIND_LABEL: Record<ArtifactKind, string> = {
  command: 'Commands',
  skill: 'Skills',
  subagent: 'Subagents',
  hook: 'Hooks',
  'mcp-server': 'MCP servers',
};

const KIND_ORDER: ArtifactKind[] = [
  'command',
  'skill',
  'subagent',
  'hook',
  'mcp-server',
];

const MONO_KINDS: ReadonlySet<ArtifactKind> = new Set<ArtifactKind>([
  'command',
  'hook',
  'mcp-server',
]);

type InlineForm = 'none' | 'approve' | 'request-changes' | 'reject';

export function SuggestionReviewPane({
  suggestion,
  onApprove,
  onReject,
  onRequestChanges,
}: Readonly<SuggestionReviewPaneProps>) {
  return (
    <PMBox paddingX={8} paddingY={6} maxW="960px">
      <PMVStack gap={5} align="stretch">
        <IdentityStrip suggestion={suggestion} />
        <OriginMetadata suggestion={suggestion} />
        <RationaleBlock description={suggestion.description} />
        <ArtifactsBlock artifacts={suggestion.artifacts} />
        {suggestion.comments.length > 0 && (
          <CommentsBlock comments={suggestion.comments} />
        )}
        <DecisionArea
          onApprove={onApprove}
          onReject={onReject}
          onRequestChanges={onRequestChanges}
        />
      </PMVStack>
    </PMBox>
  );
}

function IdentityStrip({ suggestion }: Readonly<{ suggestion: Suggestion }>) {
  return (
    <PMVStack gap={2} align="start">
      <PMHStack gap={3} align="center" wrap="wrap">
        <PMHeading size="lg" color="primary">
          {suggestion.pluginName}
        </PMHeading>
        <PMText
          fontSize="sm"
          color="text.faded"
          fontVariantNumeric="tabular-nums"
        >
          proposed v{suggestion.proposedVersion}
        </PMText>
        <StateBadge state={suggestion.state} />
      </PMHStack>
      <PMHStack gap={2} align="center" wrap="wrap">
        <OriginChip name={suggestion.originSpace.name} />
        <Dot />
        <PMText fontSize="xs" color="text.faded">
          suggested by {suggestion.suggester.name},{' '}
          {suggestion.suggestedRelative}
        </PMText>
      </PMHStack>
    </PMVStack>
  );
}

function StateBadge({ state }: Readonly<{ state: Suggestion['state'] }>) {
  if (state === 'pending') {
    return (
      <PMHStack
        gap={1}
        align="center"
        bg="background.tertiary"
        paddingX="8px"
        paddingY="2px"
        borderRadius="sm"
      >
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg="branding.primary"
          aria-hidden
        />
        <PMText
          fontSize="xs"
          color="text.secondary"
          fontWeight="medium"
          letterSpacing="0.025em"
        >
          pending
        </PMText>
      </PMHStack>
    );
  }
  if (state === 'in-review') {
    return (
      <PMHStack
        gap={1}
        align="center"
        bg="background.tertiary"
        paddingX="8px"
        paddingY="2px"
        borderRadius="sm"
      >
        <PMIcon fontSize="11px" color="text.secondary">
          <LuMessageSquare />
        </PMIcon>
        <PMText
          fontSize="xs"
          color="text.secondary"
          fontWeight="medium"
          letterSpacing="0.025em"
        >
          in review
        </PMText>
      </PMHStack>
    );
  }
  return null;
}

function OriginChip({ name }: Readonly<{ name: string }>) {
  return (
    <PMBadge size="md">
      <PMStatus.Root colorPalette={getSpaceColorPalette(name)}>
        <PMStatus.Indicator />
      </PMStatus.Root>
      {name}
    </PMBadge>
  );
}

function Dot() {
  return (
    <PMText fontSize="xs" color="faded" aria-hidden>
      &middot;
    </PMText>
  );
}

function OriginMetadata({ suggestion }: Readonly<{ suggestion: Suggestion }>) {
  return (
    <PMHStack
      gap={6}
      align="center"
      bg="background.secondary"
      paddingX={4}
      paddingY={3}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.tertiary"
      wrap="wrap"
    >
      <MetaCell label="Space of origin" value={suggestion.originSpace.name} />
      <MetaCell
        label="Installs in space"
        value={String(suggestion.originUsage.installsInSpace)}
      />
      <MetaCell label="Package" value={suggestion.packageSlug} mono />
    </PMHStack>
  );
}

type MetaCellProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function MetaCell({ label, value, mono = false }: Readonly<MetaCellProps>) {
  return (
    <PMVStack gap={0.5} align="start" minW={0}>
      <PMText
        fontSize="11px"
        color="text.faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        {label}
      </PMText>
      <PMText
        fontSize="sm"
        color="text.primary"
        fontFamily={mono ? 'mono' : undefined}
        fontVariantNumeric={mono ? 'tabular-nums' : undefined}
      >
        {value}
      </PMText>
    </PMVStack>
  );
}

function RationaleBlock({ description }: Readonly<{ description: string }>) {
  return (
    <PMVStack gap={2} align="stretch">
      <SectionLabel>Why</SectionLabel>
      <PMText fontSize="md" color="text.secondary" lineHeight={1.6} maxW="70ch">
        {description}
      </PMText>
    </PMVStack>
  );
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PMText
      fontSize="11px"
      color="text.faded"
      textTransform="uppercase"
      letterSpacing="wider"
      fontWeight="semibold"
    >
      {children}
    </PMText>
  );
}

function ArtifactsBlock({ artifacts }: Readonly<{ artifacts: Artifact[] }>) {
  const grouped = groupArtifacts(artifacts);
  const total = artifacts.length;
  return (
    <PMVStack gap={3} align="stretch">
      <PMHStack gap={2} align="baseline">
        <SectionLabel>What&rsquo;s inside</SectionLabel>
        <PMText
          fontSize="11px"
          color="text.faded"
          fontVariantNumeric="tabular-nums"
        >
          {total} {total === 1 ? 'artifact' : 'artifacts'}
        </PMText>
      </PMHStack>
      <PMVStack gap={4} align="stretch">
        {KIND_ORDER.map((kind) => {
          const items = grouped[kind];
          if (!items || items.length === 0) return null;
          return <ArtifactGroup key={kind} kind={kind} items={items} />;
        })}
      </PMVStack>
    </PMVStack>
  );
}

type ArtifactGroupProps = {
  kind: ArtifactKind;
  items: Artifact[];
};

function ArtifactGroup({ kind, items }: Readonly<ArtifactGroupProps>) {
  const Icon = KIND_ICON[kind];
  const useMono = MONO_KINDS.has(kind);
  return (
    <PMVStack gap={2} align="stretch">
      <PMHStack gap={2} align="center">
        <PMIcon fontSize="sm" color="text.faded">
          <Icon />
        </PMIcon>
        <PMText fontSize="sm" color="text.secondary" fontWeight="medium">
          {KIND_LABEL[kind]}
        </PMText>
        <PMText
          fontSize="11px"
          color="text.faded"
          fontVariantNumeric="tabular-nums"
        >
          {items.length}
        </PMText>
      </PMHStack>
      <PMVStack
        gap={0}
        align="stretch"
        borderTopWidth="1px"
        borderColor="border.tertiary"
      >
        {items.map((a) => (
          <PMVStack
            key={a.id}
            gap={0.5}
            align="stretch"
            paddingY={2.5}
            borderBottomWidth="1px"
            borderColor="border.tertiary"
          >
            <PMText
              fontSize="sm"
              color="text.primary"
              fontFamily={useMono ? 'mono' : undefined}
              fontWeight="medium"
            >
              {a.name}
            </PMText>
            <PMText fontSize="xs" color="text.secondary" lineHeight={1.5}>
              {a.summary}
            </PMText>
          </PMVStack>
        ))}
      </PMVStack>
    </PMVStack>
  );
}

function groupArtifacts(
  artifacts: Artifact[],
): Partial<Record<ArtifactKind, Artifact[]>> {
  const out: Partial<Record<ArtifactKind, Artifact[]>> = {};
  for (const a of artifacts) {
    const bucket = out[a.kind] ?? [];
    bucket.push(a);
    out[a.kind] = bucket;
  }
  return out;
}

function CommentsBlock({
  comments,
}: Readonly<{ comments: SuggestionComment[] }>) {
  return (
    <PMVStack gap={3} align="stretch">
      <SectionLabel>Conversation</SectionLabel>
      <PMVStack gap={3} align="stretch">
        {comments.map((c, idx) => (
          <CommentRow key={idx} comment={c} />
        ))}
      </PMVStack>
    </PMVStack>
  );
}

function CommentRow({ comment }: Readonly<{ comment: SuggestionComment }>) {
  const isAdmin = comment.author === 'admin';
  return (
    <PMVStack
      gap={1.5}
      align="stretch"
      bg="background.secondary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      paddingX={3}
      paddingY={2.5}
    >
      <PMHStack gap={2} align="center">
        <PMText fontSize="xs" color="text.primary" fontWeight="semibold">
          {comment.authorName}
        </PMText>
        <PMText fontSize="11px" color="text.faded" fontWeight="medium">
          {isAdmin ? 'admin' : 'suggester'}
        </PMText>
        <Dot />
        <PMText fontSize="11px" color="text.faded">
          {comment.at}
        </PMText>
      </PMHStack>
      <PMText
        fontSize="sm"
        color="text.secondary"
        lineHeight={1.55}
        maxW="70ch"
      >
        {comment.body}
      </PMText>
    </PMVStack>
  );
}

type DecisionAreaProps = {
  onApprove: (policy: { mandatory: boolean; autoUpdate: boolean }) => void;
  onReject: (reason: string) => void;
  onRequestChanges: (body: string) => void;
};

function DecisionArea({
  onApprove,
  onReject,
  onRequestChanges,
}: Readonly<DecisionAreaProps>) {
  const [form, setForm] = useState<InlineForm>('none');
  const [mandatory, setMandatory] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [reason, setReason] = useState('');
  const [changeRequest, setChangeRequest] = useState('');

  const reset = () => {
    setForm('none');
    setReason('');
    setChangeRequest('');
    setMandatory(false);
    setAutoUpdate(false);
  };

  return (
    <PMVStack
      gap={3}
      align="stretch"
      bg="background.secondary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      padding={4}
    >
      {form === 'none' && (
        <PMHStack gap={2} align="center" wrap="wrap">
          <PMButton
            variant="primary"
            size="sm"
            onClick={() => setForm('approve')}
          >
            <PMIcon fontSize="sm">
              <LuCheck />
            </PMIcon>
            Approve
          </PMButton>
          <PMButton
            variant="outline"
            size="sm"
            onClick={() => setForm('request-changes')}
          >
            <PMIcon fontSize="sm">
              <LuMessageSquare />
            </PMIcon>
            Request changes
          </PMButton>
          <PMButton
            variant="ghost"
            size="sm"
            onClick={() => setForm('reject')}
            color="red.500"
            _hover={{ color: 'red.400', bg: 'background.tertiary' }}
          >
            <PMIcon fontSize="sm">
              <LuX />
            </PMIcon>
            Reject
          </PMButton>
        </PMHStack>
      )}

      {form === 'approve' && (
        <ApproveForm
          mandatory={mandatory}
          autoUpdate={autoUpdate}
          onMandatoryChange={setMandatory}
          onAutoUpdateChange={setAutoUpdate}
          onCancel={reset}
          onConfirm={() => {
            onApprove({ mandatory, autoUpdate });
            reset();
          }}
        />
      )}

      {form === 'request-changes' && (
        <RequestChangesForm
          value={changeRequest}
          onChange={setChangeRequest}
          onCancel={reset}
          onConfirm={() => {
            if (!changeRequest.trim()) return;
            onRequestChanges(changeRequest.trim());
            reset();
          }}
        />
      )}

      {form === 'reject' && (
        <RejectForm
          value={reason}
          onChange={setReason}
          onCancel={reset}
          onConfirm={() => {
            if (!reason.trim()) return;
            onReject(reason.trim());
            reset();
          }}
        />
      )}
    </PMVStack>
  );
}

type ApproveFormProps = {
  mandatory: boolean;
  autoUpdate: boolean;
  onMandatoryChange: (next: boolean) => void;
  onAutoUpdateChange: (next: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function ApproveForm({
  mandatory,
  autoUpdate,
  onMandatoryChange,
  onAutoUpdateChange,
  onConfirm,
  onCancel,
}: Readonly<ApproveFormProps>) {
  return (
    <PMVStack gap={4} align="stretch">
      <SectionLabel>Policy on approval</SectionLabel>
      <PMVStack gap={3} align="stretch">
        <PolicyRow
          icon={LuRefreshCw}
          label="Auto-update"
          explanation="Consumers receive every new version on the next sync."
          checked={autoUpdate}
          onChange={onAutoUpdateChange}
        />
        <PolicyRow
          icon={LuPin}
          label="Mandatory"
          explanation="Consumers cannot uninstall it from their repo."
          checked={mandatory}
          onChange={onMandatoryChange}
        />
      </PMVStack>
      <PMHStack gap={2} justify="flex-end">
        <PMButton variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </PMButton>
        <PMButton variant="primary" size="sm" onClick={onConfirm}>
          <PMIcon fontSize="sm">
            <LuCheck />
          </PMIcon>
          Approve and publish
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
}

type PolicyRowProps = {
  icon: IconType;
  label: string;
  explanation: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

function PolicyRow({
  icon: Icon,
  label,
  explanation,
  checked,
  onChange,
}: Readonly<PolicyRowProps>) {
  return (
    <PMHStack gap={3} align="center" justify="space-between">
      <PMHStack gap={3} align="center" flex={1} minW={0}>
        <PMIcon fontSize="sm" color="text.faded">
          <Icon />
        </PMIcon>
        <PMVStack gap={0.5} align="start" flex={1} minW={0}>
          <PMText fontSize="sm" color="text.primary" fontWeight="medium">
            {label}
          </PMText>
          <PMText fontSize="xs" color="text.secondary">
            {explanation}
          </PMText>
        </PMVStack>
      </PMHStack>
      <PMSwitch
        checked={checked}
        onCheckedChange={(details) => onChange(details.checked)}
        colorPalette="blue"
        aria-label={label}
      />
    </PMHStack>
  );
}

type CommentFormProps = {
  value: string;
  onChange: (next: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function RequestChangesForm({
  value,
  onChange,
  onConfirm,
  onCancel,
}: Readonly<CommentFormProps>) {
  const valid = value.trim().length > 0;
  return (
    <PMVStack gap={3} align="stretch">
      <SectionLabel>Request changes</SectionLabel>
      <PMTextArea
        placeholder="What needs to change before this can ship? The suggester will see this."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        aria-label="Change request body"
      />
      <PMHStack gap={2} justify="flex-end">
        <PMButton variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </PMButton>
        <PMButton
          variant="primary"
          size="sm"
          onClick={onConfirm}
          disabled={!valid}
        >
          <PMIcon fontSize="sm">
            <LuMessageSquare />
          </PMIcon>
          Send back
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
}

function RejectForm({
  value,
  onChange,
  onConfirm,
  onCancel,
}: Readonly<CommentFormProps>) {
  const valid = value.trim().length > 0;
  return (
    <PMVStack gap={3} align="stretch">
      <SectionLabel>Reject suggestion</SectionLabel>
      <PMTextArea
        placeholder="Why are you rejecting? The suggester will see this."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        aria-label="Rejection reason"
      />
      <PMHStack gap={2} justify="flex-end">
        <PMButton variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </PMButton>
        <PMButton
          variant="danger"
          size="sm"
          onClick={onConfirm}
          disabled={!valid}
        >
          <PMIcon fontSize="sm">
            <LuX />
          </PMIcon>
          Reject
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
}
