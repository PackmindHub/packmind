import '@packmind/assets';
import type { Preview } from '@storybook/react';
import { UIProvider } from '../src';

const preview: Preview = {
  decorators: [
    (Story) => (
      <UIProvider>
        <Story></Story>
      </UIProvider>
    ),
  ],
};

export default preview;
