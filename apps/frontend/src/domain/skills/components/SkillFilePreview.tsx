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
  PMText,
  PMIconButton,
  PMTooltip,
} from '@packmind/ui';
import type { SkillFile } from '@packmind/types';
import { getFileLanguage, isPreviewable } from '../utils/fileTreeUtils';

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
  const isMarkdown = file.path.toLowerCase().endsWith('.md');
  const fileName = file.path.split('/').pop() ?? 'file';

  const handleDownload = () => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPreviewContent = () => {
    if (!canPreview) {
      return (
        <PMEmptyState
          title="Preview unavailable"
          description={`Files of type ".${file.path.split('.').pop()}" cannot be previewed`}
        >
          <PMButton onClick={handleDownload}>Download file</PMButton>
        </PMEmptyState>
      );
    }

    if (isMarkdown) {
      return (
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
    }

    return <PMCodeMirror value={file.content} language={language} readOnly />;
  };

  const renderRawContent = () => (
    <PMCodeMirror value={file.content} language={language} readOnly />
  );

  const tabs = [
    {
      value: 'preview',
      triggerLabel: 'Preview',
      content: renderPreviewContent(),
    },
    {
      value: 'raw',
      triggerLabel: 'Raw',
      content: renderRawContent(),
    },
  ];

  return (
    <PMVStack align="stretch" gap={4} width="full">
      <PMHStack justify="space-between" align="center">
        <PMText fontWeight="bold" variant="small" color="secondary">
          {fileName}
        </PMText>
        <PMHStack gap={2}>
          <PMTooltip label="Download file">
            <PMIconButton
              aria-label="Download file"
              variant="outline"
              size="sm"
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
                  variant="outline"
                  size="sm"
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

      <PMTabs tabs={tabs} defaultValue="preview" />
    </PMVStack>
  );
};
