import { ReactNode } from 'react';
import { CreateWithMcpContent } from './CreateWithMcpContent';

type GettingStartedDialog = {
  title?: string;
  body: ReactNode;
};

const DEFAULT_DIALOGS = {
  create: {
    title: 'How to create commands and standards',
    body: <CreateWithMcpContent />,
  },
};

// Export public constant to reuse the same "create" dialog content elsewhere (e.g., Standards empty state)
export const GETTING_STARTED_CREATE_DIALOG = DEFAULT_DIALOGS.create;
