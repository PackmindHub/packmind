import React from 'react';
import { MarkdownEditor } from '../../../../../../shared/components/editor/MarkdownEditor';

/**
 * OSS stub for the proprietary `MarkdownEditorWithMode`, reached through the
 * `@packmind/proprietary/frontend` alias.
 *
 * The proprietary editor offers a second way to write the same markdown, a raw
 * CodeMirror pane beside the WYSIWYG one. The OSS edition ships one editor, so
 * this renders it and no switch: a mode control with a single mode is a control
 * that lies about what it does.
 *
 * `defaultMode` is accepted and ignored for the same reason. Callers live in the
 * shared tree and must not have to know which edition they are compiled for.
 */
export type MarkdownEditorMode = 'wysiwyg' | 'raw';

interface IMarkdownEditorWithModeProps {
  defaultValue: string;
  onMarkdownChange?: (value: string) => void;
  readOnly?: boolean;
  paddingVariant?: 'default' | 'none';
  defaultMode?: MarkdownEditorMode;
}

export const MarkdownEditorWithMode: React.FC<IMarkdownEditorWithModeProps> = ({
  defaultValue,
  onMarkdownChange,
  readOnly = false,
  paddingVariant = 'default',
}) => (
  <MarkdownEditor
    defaultValue={defaultValue}
    onMarkdownChange={onMarkdownChange}
    readOnly={readOnly}
    paddingVariant={paddingVariant}
  />
);
