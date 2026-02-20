import { PMBox, PMMarkdownViewer } from '@packmind/ui';
import { ScalarUpdatePayload } from '@packmind/types';
import { buildDiffHtml, markdownDiffCss } from '../../../utils/markdownDiff';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../../shared/components/editor/MarkdownEditor';

export function renderMarkdownDiffOrPreview(
  isDiff: boolean,
  showPreview: boolean,
  payload: ScalarUpdatePayload,
  currentValue: string,
  options?: {
    diffBoxPadding?: string;
    previewPaddingVariant?: 'none';
    defaultPaddingVariant?: 'none';
  },
) {
  if (isDiff && !showPreview) {
    return (
      <PMBox padding={options?.diffBoxPadding} css={markdownDiffCss}>
        <PMMarkdownViewer
          htmlContent={buildDiffHtml(payload.oldValue, payload.newValue)}
        />
      </PMBox>
    );
  }
  const value = isDiff ? payload.newValue : currentValue;
  const paddingVariant = isDiff
    ? options?.previewPaddingVariant
    : options?.defaultPaddingVariant;
  return (
    <MarkdownEditorProvider>
      <MarkdownEditor
        defaultValue={value}
        readOnly
        paddingVariant={paddingVariant}
      />
    </MarkdownEditorProvider>
  );
}
