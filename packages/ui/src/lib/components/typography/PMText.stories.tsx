import type { Meta, StoryObj } from '@storybook/react';
import { PMText } from './PMText';

const meta: Meta<typeof PMText> = {
  title: 'Typography/PMText',
  component: PMText,
  argTypes: {
    as: { control: 'select', defaultValue: 'span' },
    variant: {
      control: 'select',
      options: ['body', 'body-important', 'small', 'small-important'],
      defaultValue: 'body',
    },
    children: { control: 'text', defaultValue: 'Texte de démonstration' },
  },
};
export default meta;

type Story = StoryObj<typeof PMText>;

export const Default: Story = {
  args: {
    children: 'Texte de démonstration',
  },
};

export const AllVariants: Story = {
  render: () => (
    <>
      <PMText as="p" variant="body">
        Variant "body"
      </PMText>
      <PMText as="p" variant="body-important">
        Variant "body-important"
      </PMText>
      <PMText as="p" variant="small">
        Variant "small"
      </PMText>
      <PMText as="p" variant="small-important">
        Variant "small-important"
      </PMText>
    </>
  ),
};
