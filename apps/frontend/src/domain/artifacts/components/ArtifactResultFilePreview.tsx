import { ReactNode } from 'react';
import {
  PMBox,
  PMBreadcrumb,
  PMCodeMirror,
  PMHStack,
  PMMarkdownViewer,
  PMTabs,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { CopyMarkdownButton } from './CopyMarkdownButton';
import { DownloadAsAgentButton } from './DownloadAsAgentButton';
import { stripFrontmatter } from '../utils/stripFrontmatter';

interface ArtifactResultFilePreviewProps {
  fileName?: string;
  markdown: string;
  previewContent?: ReactNode;
  hideActions?: boolean;
  hideFileName?: boolean;
  getPreviewCommand?: () => unknown;
}

export function ArtifactResultFilePreview({
  fileName,
  markdown,
  previewContent,
  hideActions = false,
  hideFileName = false,
  getPreviewCommand,
}: Readonly<ArtifactResultFilePreviewProps>) {
  const defaultPreview = (
    <PMBox
      border="solid 1px"
      borderColor="border.primary"
      borderRadius="md"
      padding={4}
      backgroundColor="background.primary"
    >
      <PMMarkdownViewer content={stripFrontmatter(markdown)} />
    </PMBox>
  );

  const tabs = [
    {
      value: 'preview',
      triggerLabel: 'Preview',
      content: previewContent ?? defaultPreview,
    },
    {
      value: 'raw',
      triggerLabel: 'Raw',
      content: <PMCodeMirror value={markdown} language="markdown" readOnly />,
    },
  ];

  return (
    <PMBox
      border="solid 1px"
      borderColor="border.tertiary"
      borderRadius="md"
      p={4}
    >
      <PMVStack align="stretch" gap={2} width="full">
        <PMHStack
          justify={hideFileName ? 'flex-end' : 'space-between'}
          align="center"
        >
          {!hideFileName && fileName && (
            <PMBreadcrumb segments={fileName.split('/')} interactive={false} />
          )}
          {!hideActions && (
            <PMHStack gap={1}>
              <CopyMarkdownButton markdown={markdown} />
              {getPreviewCommand && (
                <DownloadAsAgentButton getPreviewCommand={getPreviewCommand} />
              )}
            </PMHStack>
          )}
        </PMHStack>

        <PMTabs
          tabs={tabs}
          defaultValue="preview"
          variant="enclosed"
          size="sm"
          css={{ '& [role="tablist"]': { marginBottom: '0.75rem' } }}
        />
      </PMVStack>
    </PMBox>
  );
}
