import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import '@packmind/assets/milkdown.theme';
import { PMBox } from '@packmind/ui';
import React from 'react';
import { ListenerManager } from '@milkdown/kit/plugin/listener';

export interface IMarkdownEditorApi {
  getMarkdown: () => string;
}

interface IMarkdownEditorProps {
  defaultValue: string;
  onMarkdownChange?: (value: string) => void;
  /**
   * Called once the editor is created, with a handle to read the current
   * markdown synchronously. onMarkdownChange is debounced by the Milkdown
   * listener plugin, so consumers that need the up-to-date content at a
   * precise moment (e.g. on save) must read it through this handle instead.
   */
  onEditorReady?: (api: IMarkdownEditorApi) => void;
  readOnly?: boolean;
  paddingVariant?: 'default' | 'none';
}

export const MarkdownEditor: React.FC<IMarkdownEditorProps> = ({
  defaultValue,
  onMarkdownChange,
  onEditorReady,
  readOnly = false,
  paddingVariant = 'default',
}) => {
  const crepeRef = React.useRef<Crepe | null>(null);

  const { loading } = useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue,
      features: {
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.Latex]: false,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: 'Start writing (Markdown syntax) or type "/" for commands',
        },
      },
    });

    crepe.setReadonly(readOnly);

    crepe.on((listener: ListenerManager) => {
      listener.markdownUpdated(() => {
        onMarkdownChange?.(crepe.getMarkdown());
      });
    });

    crepeRef.current = crepe;
    return crepe;
  });

  React.useEffect(() => {
    if (!loading && crepeRef.current && onEditorReady) {
      const crepe = crepeRef.current;
      onEditorReady({ getMarkdown: () => crepe.getMarkdown() });
    }
  }, [loading, onEditorReady]);

  return (
    <PMBox data-milkdown-padding-variant={paddingVariant}>
      <Milkdown />
    </PMBox>
  );
};

export const MarkdownEditorProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <MilkdownProvider>{children}</MilkdownProvider>;
};
