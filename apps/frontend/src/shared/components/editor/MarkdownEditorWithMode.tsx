import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PMBox, PMCodeMirror, PMTabs } from '@packmind/ui';
import {
  IMarkdownEditorApi,
  MarkdownEditor,
  MarkdownEditorProvider,
} from './MarkdownEditor';

export type MarkdownEditorMode = 'wysiwyg' | 'raw';

export interface IMarkdownEditorWithModeApi {
  getMarkdown: () => string;
}

interface IMarkdownEditorWithModeProps {
  defaultValue: string;
  onEditorReady?: (api: IMarkdownEditorWithModeApi) => void;
  readOnly?: boolean;
  paddingVariant?: 'default' | 'none';
  defaultMode?: MarkdownEditorMode;
}

/**
 * Markdown editor that lets the user switch between the WYSIWYG (Milkdown)
 * editor and a raw markdown editor (CodeMirror). Milkdown's change events
 * are debounced (see MarkdownEditor's onEditorReady), so reads go through a
 * synchronous getMarkdown() handle rather than state fed by onMarkdownChange
 * -- otherwise Save, or a tab switch, right after a keystroke could read
 * stale content.
 */
export const MarkdownEditorWithMode: React.FC<IMarkdownEditorWithModeProps> = ({
  defaultValue,
  onEditorReady,
  readOnly = false,
  paddingVariant = 'default',
  defaultMode = 'wysiwyg',
}) => {
  const [mode, setMode] = useState<MarkdownEditorMode>(defaultMode);
  const modeRef = useRef(mode);
  const [seedValue, setSeedValueState] = useState(defaultValue);
  const seedRef = useRef(defaultValue);
  const wysiwygApiRef = useRef<IMarkdownEditorApi | null>(null);
  const rawValueRef = useRef(defaultValue);

  const setSeed = (next: string) => {
    seedRef.current = next;
    rawValueRef.current = next;
    setSeedValueState(next);
  };

  const getMarkdown = useCallback(() => {
    return modeRef.current === 'wysiwyg'
      ? (wysiwygApiRef.current?.getMarkdown() ?? seedRef.current)
      : rawValueRef.current;
  }, []);

  useEffect(() => {
    onEditorReady?.({ getMarkdown });
  }, [onEditorReady, getMarkdown]);

  const handleTabChange = (details: { value: string }) => {
    const nextMode = details.value as MarkdownEditorMode;
    // Flush the outgoing editor's live content before it unmounts, so the
    // incoming editor re-seeds with the latest edits instead of losing
    // anything still inside Milkdown's debounce window.
    setSeed(getMarkdown());
    wysiwygApiRef.current = null;
    modeRef.current = nextMode;
    setMode(nextMode);
  };

  const tabs = [
    {
      value: 'wysiwyg',
      triggerLabel: 'WYSIWYG',
      content: (
        <MarkdownEditorProvider>
          <MarkdownEditor
            defaultValue={seedValue}
            onEditorReady={(api) => {
              wysiwygApiRef.current = api;
            }}
            readOnly={readOnly}
            paddingVariant={paddingVariant}
          />
        </MarkdownEditorProvider>
      ),
    },
    {
      value: 'raw',
      triggerLabel: 'Raw',
      content: (
        <PMCodeMirror
          value={seedValue}
          language="markdown"
          readOnly={readOnly}
          minHeight="320px"
          onChange={(next) => {
            rawValueRef.current = next;
          }}
        />
      ),
    },
  ];

  return (
    <PMBox width="full">
      <PMTabs
        tabs={tabs}
        defaultValue={defaultMode}
        value={mode}
        onValueChange={handleTabChange}
        variant="enclosed"
        size="sm"
        lazyMount
        unmountOnExit
        css={{ '& [role="tablist"]': { marginBottom: '0.75rem' } }}
      />
    </PMBox>
  );
};
