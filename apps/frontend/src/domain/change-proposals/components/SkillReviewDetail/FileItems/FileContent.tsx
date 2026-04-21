import {
  PMBox,
  PMButton,
  PMCodeMirror,
  PMEmptyState,
  PMMarkdownViewer,
} from '@packmind/ui';
import { SkillFile } from '@packmind/types';
import {
  getFileLanguage,
  getMimeType,
} from '../../../../skills/utils/fileTreeUtils';

const MARKDOWN_EXTENSIONS = ['.md', '.mdx', '.mdc'];

export function isMarkdownPath(filePath: string): boolean {
  return MARKDOWN_EXTENSIONS.some((ext) =>
    filePath.toLowerCase().endsWith(ext),
  );
}

export function FileContent({
  file,
}: {
  file: Pick<SkillFile, 'isBase64' | 'path' | 'content'>;
}) {
  if (file.isBase64) {
    const fileName = file.path.split('/').pop() ?? 'file';
    const handleDownload = () => {
      const binaryString = atob(file.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: getMimeType(file.path) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };
    return (
      <PMEmptyState
        title="Preview unavailable"
        description="Binary file cannot be previewed"
      >
        <PMButton onClick={handleDownload}>Download file</PMButton>
      </PMEmptyState>
    );
  }
  if (isMarkdownPath(file.path)) {
    return (
      <PMBox p={4}>
        <PMMarkdownViewer content={file.content} />
      </PMBox>
    );
  }
  return (
    <PMCodeMirror
      value={file.content}
      language={getFileLanguage(file.path)}
      readOnly
    />
  );
}
