import { LuCopy, LuDownload } from 'react-icons/lu';
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
import type { SkillFile } from '@packmind/types';
import {
  getFileLanguage,
  getMimeType,
  isPreviewable,
} from '../utils/fileTreeUtils';

interface ISkillFilePreviewProps {
  file: SkillFile | null;
}

export const SkillFilePreview = ({ file }: ISkillFilePreviewProps) => {
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
      blob = new Blob([file.content], { type: 'text/plain' });
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
      <PMMarkdownViewer content={file.content} />
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
        />
      );
    }

    return renderCodeContent();
  };

  return (
    <PMVStack align="stretch" gap={2} width="full">
      <PMHStack justify="space-between" align="center">
        <PMBreadcrumb segments={file.path.split('/')} interactive={false} />
        <PMHStack gap={2}>
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
          <PMCopiable.Root value={file.content}>
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
      </PMHStack>

      {renderFileContent()}
    </PMVStack>
  );
};
