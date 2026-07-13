import { useEffect, useState, type MouseEvent } from 'react';
import { LuCopy, LuDownload, LuPencil } from 'react-icons/lu';
import {
  PMTabs,
  PMButton,
  PMHStack,
  PMVStack,
  PMBox,
  PMEmptyState,
  PMCopiable,
  PMCodeMirror,
  PMMarkdownViewer,
  PMIconButton,
  PMTooltip,
  PMBreadcrumb,
} from '@packmind/ui';
import type { SkillFile, SkillId } from '@packmind/types';
import {
  getFileLanguage,
  getMimeType,
  isEditableMarkdownFile,
  isPreviewable,
} from '../utils/fileTreeUtils';
import { SkillFileEditor } from './SkillFileEditor';

interface ISkillFilePreviewProps {
  file: SkillFile | null;
  clipboardContent?: string;
  transformLinkUri?: (href: string) => string;
  onLinkClick?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  skillId?: SkillId;
  skillSlug?: string;
  skillVersion?: number;
  canEdit?: boolean;
}

export const SkillFilePreview = ({
  file,
  clipboardContent,
  transformLinkUri,
  onLinkClick,
  skillId,
  skillSlug,
  skillVersion,
  canEdit = false,
}: ISkillFilePreviewProps) => {
  const [isEditing, setIsEditing] = useState(false);

  // Exit edit mode whenever the selected file changes (e.g. navigating to
  // another file via the sidebar or an in-content link).
  useEffect(() => {
    setIsEditing(false);
  }, [file?.path]);

  if (!file) {
    return (
      <PMEmptyState
        title="No file selected"
        description="Select a file from the tree to preview its content"
      />
    );
  }

  const language = getFileLanguage(file.path);
  const canPreview = isPreviewable(file.path);
  const markdownExtensions = ['.md', '.mdx', '.mdc'];
  const lowerPath = file.path.toLowerCase();
  const isMarkdown = markdownExtensions.some((ext) => lowerPath.endsWith(ext));
  const fileName = file.path.split('/').pop() ?? 'file';

  const canEditFile =
    canEdit &&
    !file.isBase64 &&
    isEditableMarkdownFile(file.path) &&
    !!skillId &&
    !!skillSlug;

  const handleDownload = () => {
    let blob: Blob;
    if (file.isBase64) {
      const binaryString = atob(file.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: getMimeType(file.path) });
    } else {
      const downloadContent = clipboardContent ?? file.content;
      blob = new Blob([downloadContent], { type: 'text/plain' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMarkdownPreview = () => (
    <PMBox
      border="solid 1px"
      borderColor="border.primary"
      borderRadius="md"
      padding={4}
      backgroundColor="background.primary"
    >
      <PMMarkdownViewer
        content={file.content}
        transformLinkUri={transformLinkUri}
        onLinkClick={onLinkClick}
      />
    </PMBox>
  );

  const renderCodeContent = () => (
    <PMCodeMirror value={file.content} language={language} readOnly />
  );

  const renderNonPreviewableContent = () => (
    <PMEmptyState
      title="Preview unavailable"
      backgroundColor={'background.primary'}
      borderRadius={'md'}
      description={`Files of type ".${file.path.split('.').pop()}" cannot be previewed`}
    >
      <PMButton onClick={handleDownload}>Download file</PMButton>
    </PMEmptyState>
  );

  const renderFileContent = () => {
    if (isEditing && canEditFile && skillId && skillSlug) {
      return (
        <SkillFileEditor
          skillId={skillId}
          skillSlug={skillSlug}
          filePath={file.path}
          initialContent={file.content}
          currentVersion={skillVersion}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      );
    }

    if (!canPreview) {
      return renderNonPreviewableContent();
    }

    if (isMarkdown) {
      const tabs = [
        {
          value: 'preview',
          triggerLabel: 'Preview',
          content: renderMarkdownPreview(),
        },
        {
          value: 'raw',
          triggerLabel: 'Raw',
          content: renderCodeContent(),
        },
      ];
      return (
        <PMTabs
          tabs={tabs}
          defaultValue="preview"
          variant="enclosed"
          size="sm"
          css={{ '& [role="tablist"]': { marginBottom: '0.75rem' } }}
        />
      );
    }

    return renderCodeContent();
  };

  return (
    <PMVStack align="stretch" gap={2} width="full">
      <PMHStack justify="space-between" align="center">
        <PMBreadcrumb segments={file.path.split('/')} interactive={false} />
        {!isEditing && (
          <PMHStack gap={2}>
            {canEditFile && (
              <PMTooltip label="Edit file">
                <PMIconButton
                  aria-label="Edit file"
                  size="sm"
                  variant="tertiary"
                  onClick={() => setIsEditing(true)}
                >
                  <LuPencil />
                </PMIconButton>
              </PMTooltip>
            )}
            <PMTooltip label="Download file">
              <PMIconButton
                aria-label="Download file"
                size="sm"
                variant="tertiary"
                onClick={handleDownload}
              >
                <LuDownload />
              </PMIconButton>
            </PMTooltip>
            <PMCopiable.Root value={clipboardContent ?? file.content}>
              <PMTooltip label="Copy to clipboard">
                <PMCopiable.Trigger asChild>
                  <PMIconButton
                    aria-label="Copy to clipboard"
                    size="sm"
                    variant="tertiary"
                  >
                    <PMCopiable.Indicator>
                      <LuCopy />
                    </PMCopiable.Indicator>
                  </PMIconButton>
                </PMCopiable.Trigger>
              </PMTooltip>
            </PMCopiable.Root>
          </PMHStack>
        )}
      </PMHStack>

      {renderFileContent()}
    </PMVStack>
  );
};
