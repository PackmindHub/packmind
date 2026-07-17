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
  IMarkdownEditorWithModeApi,
  MarkdownEditorWithMode,
} from '../../../shared/components/editor/MarkdownEditorWithMode';

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
  const analytics = useAnalytics();
  const updateSkillFileMutation = useUpdateSkillFileMutation();

  // Read the markdown synchronously from the editor on save: the WYSIWYG
  // editor's change events are debounced, so state fed by them can lag
  // behind the actual content when Save is clicked right after a keystroke.
  const editorApiRef = useRef<IMarkdownEditorWithModeApi | null>(null);
  // The WYSIWYG editor normalizes markdown on load, so its output can differ
  // from initialContent without any user edit. The no-op comparison must use
  // the normalized baseline captured at mount, not the raw initial content.
  const baselineContentRef = useRef<string | null>(null);

  const handleEditorReady = (api: IMarkdownEditorWithModeApi) => {
    editorApiRef.current = api;
    baselineContentRef.current = api.getMarkdown();
  };

  const isSaving = updateSkillFileMutation.isPending;

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

  return (
    <PMVStack align="stretch" gap={2} width="full">
      {error && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>{error}</PMAlert.Title>
        </PMAlert.Root>
      )}

      <PMBox
        border="solid 1px"
        borderColor="border.primary"
        borderRadius="md"
        backgroundColor="background.primary"
      >
        <MarkdownEditorWithMode
          defaultValue={initialContent}
          onEditorReady={handleEditorReady}
        />
      </PMBox>

      <PMHStack
        justify="flex-end"
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
          disabled={isSaving}
        >
          Save
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
};
