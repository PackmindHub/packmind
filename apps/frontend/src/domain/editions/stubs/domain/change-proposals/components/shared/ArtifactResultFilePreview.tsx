import { ReactNode } from 'react';

interface ArtifactResultFilePreviewProps {
  fileName?: string;
  markdown: string;
  previewContent?: ReactNode;
  hideActions?: boolean;
  hideFileName?: boolean;
  getPreviewCommand?: () => unknown;
}

export function ArtifactResultFilePreview(
  _props: Readonly<ArtifactResultFilePreviewProps>,
): React.ReactElement {
  return <></>;
}
