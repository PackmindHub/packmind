import { useState } from 'react';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import {
  PMAlert,
  PMButton,
  PMCodeMirror,
  PMHStack,
  PMVStack,
} from '@packmind/ui';
import { SkillId } from '@packmind/types';
import { useUpdateSkillFileMutation } from '../api/queries/SkillsQueries';
import { isPackmindError } from '../../../services/api/errors/PackmindError';

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
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const analytics = useAnalytics();
  const updateSkillFileMutation = useUpdateSkillFileMutation();

  const isSaving = updateSkillFileMutation.isPending;

  const handleSave = async () => {
    if (isSaving) return;
    setError(null);

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

    if (content === initialContent) {
      // No-op save: nothing changed, just exit edit mode silently.
      onSaved();
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

      <PMCodeMirror
        value={content}
        onChange={setContent}
        language="markdown"
        editable={!isSaving}
      />

      <PMHStack justify="flex-end" gap={2}>
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
