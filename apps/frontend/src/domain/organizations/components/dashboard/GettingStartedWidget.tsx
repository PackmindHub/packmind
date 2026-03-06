import { ReactNode } from 'react';
import { CreateFromCodeContent } from '../../../../shared/components/cli/CreateFromCodeContent';

type GettingStartedDialog = {
  title?: string;
  body: ReactNode;
};

export const GETTING_STARTED_CREATE_STANDARD_DIALOG: GettingStartedDialog = {
  title: 'How to create standards',
  body: <CreateFromCodeContent artifactType="standard" />,
};

export const GETTING_STARTED_CREATE_COMMAND_DIALOG: GettingStartedDialog = {
  title: 'How to create commands',
  body: <CreateFromCodeContent artifactType="command" />,
};
