import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import '@packmind/assets/milkdown.theme';
import React from 'react';
import { ListenerManager } from '@milkdown/kit/plugin/listener';

interface IMarkdownEditorProps {
  defaultValue: string;
  onMarkdownChange?: (value: string) => void;
  readOnly?: boolean;
}

export const MarkdownEditor: React.FC<IMarkdownEditorProps> = ({
  defaultValue,
  onMarkdownChange,
  readOnly = false,
}) => {
  useEditor((root) => {
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

    return crepe;
  });

  return <Milkdown />;
};

export const MarkdownEditorProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <MilkdownProvider>{children}</MilkdownProvider>;
};
