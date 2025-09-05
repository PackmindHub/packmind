import type { Meta } from '@storybook/react';
import { PMToaster, pmToaster } from './PMToaster';
import { PMButton } from '../../form/PMButton/PMButton';
import { PMHStack } from '../../layout';

const meta: Meta<typeof PMToaster> = {
  title: 'Feedback/PMToaster',
  component: PMToaster,
};
export default meta;

export const Basic = () => (
  <PMHStack gap={4}>
    <PMButton
      variant="secondary"
      onClick={() =>
        pmToaster.create({
          type: 'info',
          title: 'Information',
          description: "Ceci est un toast d'information.",
        })
      }
    >
      Info Toast
    </PMButton>
    <PMButton
      variant="secondary"
      onClick={() =>
        pmToaster.create({
          type: 'success',
          title: 'Succès',
          description: 'Ceci est un toast de succès.',
        })
      }
    >
      Success Toast
    </PMButton>
    <PMButton
      variant="secondary"
      onClick={() =>
        pmToaster.create({
          type: 'warning',
          title: 'Avertissement',
          description: "Ceci est un toast d'avertissement.",
        })
      }
    >
      Warning Toast
    </PMButton>
    <PMButton
      variant="secondary"
      onClick={() =>
        pmToaster.create({
          type: 'error',
          title: 'Erreur',
          description: "Ceci est un toast d'erreur.",
        })
      }
    >
      Error Toast
    </PMButton>
    <PMToaster />
  </PMHStack>
);
