import type { Meta, StoryObj } from '@storybook/react';
import { PMEllipsisMenu } from './PMEllipsisMenu';
import { PMIcon } from '../../content/PMIcon/PMIcon';
import { PMHStack } from '../../layout/PMHStack/PMHStack';
import {
  LuMail,
  LuUserCog,
  LuUserMinus,
  LuTrash2,
  LuPencil,
} from 'react-icons/lu';
import { PMText } from '../../typography/PMText';

const meta: Meta<typeof PMEllipsisMenu> = {
  title: 'Content/PMEllipsisMenu',
  component: PMEllipsisMenu,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof PMEllipsisMenu>;

export const Default: Story = {
  args: {
    title: 'Actions',
    disabled: false,
    actions: [
      {
        value: 'edit',
        onClick: () => alert('Edit clicked'),
        content: <PMText color="secondary">Edit</PMText>,
      },
      {
        value: 'delete',
        onClick: () => alert('Delete clicked'),
        content: <PMText color="error">Delete</PMText>,
      },
    ],
  },
};

export const WithIcons: Story = {
  args: {
    title: 'User actions',
    disabled: false,
    actions: [
      {
        value: 'resend',
        onClick: () => alert('Resend invitation'),
        content: (
          <PMHStack gap={2}>
            <PMIcon>
              <LuMail />
            </PMIcon>
            <PMText color="secondary">Resend invitation</PMText>
          </PMHStack>
        ),
      },
      {
        value: 'change-role',
        onClick: () => alert('Change role'),
        content: (
          <PMHStack gap={2}>
            <PMIcon>
              <LuUserCog />
            </PMIcon>
            <PMText color="secondary">Change role</PMText>
          </PMHStack>
        ),
      },
      {
        value: 'remove',
        onClick: () => alert('Remove user'),
        content: (
          <PMHStack gap={2}>
            <PMIcon>
              <LuUserMinus />
            </PMIcon>
            <PMText color="error">Remove from organization</PMText>
          </PMHStack>
        ),
      },
    ],
  },
};

export const SimpleActions: Story = {
  args: {
    title: 'More options',
    disabled: false,
    actions: [
      {
        value: 'edit',
        onClick: () => alert('Edit'),
        content: (
          <PMHStack gap={2}>
            <PMIcon>
              <LuPencil />
            </PMIcon>
            <PMText color="secondary">Edit</PMText>
          </PMHStack>
        ),
      },
      {
        value: 'delete',
        onClick: () => alert('Delete'),
        content: (
          <PMHStack gap={2}>
            <PMIcon>
              <LuTrash2 />
            </PMIcon>
            <PMText color="error">Delete</PMText>
          </PMHStack>
        ),
      },
    ],
  },
};

export const Disabled: Story = {
  args: {
    title: 'Actions',
    disabled: true,
    actions: [
      {
        value: 'edit',
        onClick: () => alert('Edit clicked'),
        content: <PMText color="secondary">Edit</PMText>,
      },
      {
        value: 'delete',
        onClick: () => alert('Delete clicked'),
        content: <PMText color="error">Delete</PMText>,
      },
    ],
  },
};

export const SingleAction: Story = {
  args: {
    title: 'Action',
    disabled: false,
    actions: [
      {
        value: 'view-details',
        onClick: () => alert('View details'),
        content: <PMText color="secondary">View details</PMText>,
      },
    ],
  },
};

export const ManyActions: Story = {
  args: {
    title: 'All actions',
    disabled: false,
    actions: [
      {
        value: 'view',
        onClick: () => alert('View'),
        content: <PMText color="secondary">View</PMText>,
      },
      {
        value: 'edit',
        onClick: () => alert('Edit'),
        content: <PMText color="secondary">Edit</PMText>,
      },
      {
        value: 'duplicate',
        onClick: () => alert('Duplicate'),
        content: <PMText color="secondary">Duplicate</PMText>,
      },
      {
        value: 'archive',
        onClick: () => alert('Archive'),
        content: <PMText color="secondary">Archive</PMText>,
      },
      {
        value: 'delete',
        onClick: () => alert('Delete'),
        content: <PMText color="error">Delete</PMText>,
      },
    ],
  },
};
