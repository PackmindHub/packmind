import { PMBox, PMMarkdownViewer, PMText } from '@packmind/ui';
import { SkillFile } from '@packmind/types';

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
    return (
      <PMText fontSize="xs" color="secondary">
        Binary file
      </PMText>
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
    <PMBox
      as="pre"
      fontSize="xs"
      overflow="auto"
      maxHeight="200px"
      p={2}
      borderRadius="sm"
      bg="background.secondary"
    >
      {file.content}
    </PMBox>
  );
}
