import { useRef, useState } from 'react';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { SkillId } from '@packmind/types';
import { useUpdateSkillFileMutation } from '../api/queries/SkillsQueries';
import { isPackmindError } from '../../../services/api/errors/PackmindError';
import {
  IMarkdownEditorApi,
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';
import { useListChangeProposalsBySkillQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import {
  countPendingChangeProposals,
  PendingChangeProposalsWarning,
  ConfirmSaveWithPendingProposalsDialog,
} from '../../../shared/components/PendingChangeProposals';

// Mirrors packages/skills/src/application/validator/SkillValidator.ts (SKILL_FILE_MAX_CONTENT_LENGTH)
const SKILL_FILE_MAX_CONTENT_LENGTH = 300_000;

interface ISkillFileEditorProps {
  skillId: SkillId;
  skillSlug: string;
  filePath: string;
  initialContent: string;
  currentVersion?: number;
  onCancel: () => void;
  onSaved: () => void;
}

export const SkillFileEditor = ({
  skillId,
  skillSlug,
  filePath,
  initialContent,
  currentVersion,
  onCancel,
  onSaved,
}: ISkillFileEditorProps) => {
  const [error, setError] = useState<string | null>(null);
  // The Milkdown editor initializes asynchronously, so onEditorReady fires
  // after mount rather than during it. Track readiness explicitly so Save
  // reflects that state instead of silently doing nothing if clicked first.
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingSaveContent, setPendingSaveContent] = useState<string | null>(
    null,
  );
  const analytics = useAnalytics();
  const updateSkillFileMutation = useUpdateSkillFileMutation();

  const { data: changeProposals } = useListChangeProposalsBySkillQuery(skillId);
  const pendingChangeProposalsCount =
    countPendingChangeProposals(changeProposals);

  // Read the markdown synchronously from the editor on save: the WYSIWYG
  // editor's change events are debounced, so state fed by them can lag
  // behind the actual content when Save is clicked right after a keystroke.
  const editorApiRef = useRef<IMarkdownEditorApi | null>(null);
  // The WYSIWYG editor normalizes markdown on load, so its output can differ
  // from initialContent without any user edit. The no-op comparison must use
  // the normalized baseline captured at mount, not the raw initial content.
  const baselineContentRef = useRef<string | null>(null);

  const handleEditorReady = (api: IMarkdownEditorApi) => {
    editorApiRef.current = api;
    baselineContentRef.current = api.getMarkdown();
    setIsEditorReady(true);
  };

  const isSaving = updateSkillFileMutation.isPending;

  const performSave = async (content: string) => {
    try {
      const response = await updateSkillFileMutation.mutateAsync({
        skillId,
        slug: skillSlug,
        filePath,
        content,
      });

      if (response.versionCreated && response.skillVersion) {
        analytics.track('artifact_updated', {
          artifactType: 'skill',
          id: skillId,
          from: currentVersion ?? response.skillVersion.version - 1,
          to: response.skillVersion.version,
        });
        pmToaster.create({
          type: 'success',
          title: 'File saved',
          description: 'Your changes have been saved.',
        });
      }

      onSaved();
    } catch (mutationError) {
      if (isPackmindError(mutationError)) {
        setError(mutationError.serverError.data.message);
      } else {
        setError('Unable to save file. Please try again.');
      }
    }
  };

  const handleSave = async () => {
    if (isSaving || !editorApiRef.current) return;
    setError(null);

    const content = editorApiRef.current.getMarkdown();

    if (content === (baselineContentRef.current ?? initialContent)) {
      // No-op save: nothing changed, just exit edit mode silently.
      onSaved();
      return;
    }

    if (content.trim().length === 0) {
      setError('File content cannot be empty.');
      return;
    }

    if (content.length > SKILL_FILE_MAX_CONTENT_LENGTH) {
      setError(
        `File content exceeds the maximum length of ${SKILL_FILE_MAX_CONTENT_LENGTH.toLocaleString()} characters.`,
      );
      return;
    }

    if (pendingChangeProposalsCount > 0) {
      setPendingSaveContent(content);
      setConfirmSaveOpen(true);
      return;
    }

    await performSave(content);
  };

  const handleConfirmSave = async () => {
    setConfirmSaveOpen(false);
    if (pendingSaveContent !== null) {
      const content = pendingSaveContent;
      setPendingSaveContent(null);
      await performSave(content);
    }
  };

  return (
    <PMVStack align="stretch" gap={2} width="full">
      {error && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>{error}</PMAlert.Title>
        </PMAlert.Root>
      )}

      <PendingChangeProposalsWarning
        count={pendingChangeProposalsCount}
        itemType="skill"
        marginBottom={0}
        marginTop={2}
      />
      <ConfirmSaveWithPendingProposalsDialog
        open={confirmSaveOpen}
        onOpenChange={({ open }) => setConfirmSaveOpen(open)}
        count={pendingChangeProposalsCount}
        itemType="skill"
        onConfirm={handleConfirmSave}
      />

      <PMBox
        border="solid 1px"
        borderColor="border.primary"
        borderRadius="md"
        backgroundColor="background.primary"
      >
        <MarkdownEditorProvider>
          <MarkdownEditor
            defaultValue={initialContent}
            onEditorReady={handleEditorReady}
          />
        </MarkdownEditorProvider>
      </PMBox>

      <PMHStack
        justify="center"
        gap={2}
        position="sticky"
        bottom={0}
        paddingY={3}
        backgroundColor="background.secondary"
        borderTop="solid 1px"
        borderColor="border.primary"
      >
        <PMButton variant="tertiary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </PMButton>
        <PMButton
          variant="primary"
          onClick={handleSave}
          loading={isSaving}
          disabled={isSaving || !isEditorReady}
        >
          Save
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
};
