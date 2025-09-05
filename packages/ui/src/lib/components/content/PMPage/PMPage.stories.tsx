import type { Meta, StoryObj } from '@storybook/react';
import { Box, Card, VStack } from '@chakra-ui/react';
import { PMPage } from './PMPage';
import { PMButton } from '../../form/PMButton/PMButton';
import { PMText } from '../../typography/PMText';

const meta: Meta<typeof PMPage> = {
  title: 'Layout/PMPage',
  component: PMPage,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text', defaultValue: 'Page Title' },
    subtitle: { control: 'text' },
    maxWidth: { control: 'text', defaultValue: '1200px' },
    padding: { control: 'number', defaultValue: 6 },
    isFullWidth: { control: 'boolean', defaultValue: false },
  },
};
export default meta;

type Story = StoryObj<typeof PMPage>;

const SampleContent = () => (
  <VStack align="stretch" gap={4}>
    <PMText>
      This is the main content area. It can contain any components or content
      that you need for your page.
    </PMText>
    <Card.Root>
      <Card.Header>
        <PMText variant="body-important">Sample Card</PMText>
      </Card.Header>
      <Card.Body>
        <PMText>
          This is a sample card component to demonstrate how content looks
          within the page layout.
        </PMText>
      </Card.Body>
    </Card.Root>
  </VStack>
);

const SampleSidebar = () => (
  <VStack align="stretch" gap={4}>
    <Card.Root>
      <Card.Header>
        <PMText variant="body-important">Quick Actions</PMText>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={2}>
          <PMButton size="sm">Action 1</PMButton>
          <PMButton size="sm" variant="outline">
            Action 2
          </PMButton>
        </VStack>
      </Card.Body>
    </Card.Root>
    <Card.Root>
      <Card.Header>
        <PMText variant="body-important">Information</PMText>
      </Card.Header>
      <Card.Body>
        <PMText variant="small">
          This is additional information that might be helpful for the user.
        </PMText>
      </Card.Body>
    </Card.Root>
  </VStack>
);

export const Default: Story = {
  args: {
    title: 'Dashboard',
    subtitle: 'Welcome to your dashboard',
    children: <SampleContent />,
  },
};

export const WithBreadcrumbs: Story = {
  args: {
    title: 'User Profile',
    subtitle: 'Manage your account settings',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Users', href: '/users' },
      { label: 'Profile', isCurrentPage: true },
    ],
    children: <SampleContent />,
  },
};

export const WithActions: Story = {
  args: {
    title: 'Project Settings',
    subtitle: 'Configure your project preferences',
    actions: (
      <Box>
        <PMButton>Save Changes</PMButton>
      </Box>
    ),
    children: <SampleContent />,
  },
};

export const WithSidebar: Story = {
  args: {
    title: 'Article Editor',
    subtitle: 'Write and edit your articles',
    sidebar: <SampleSidebar />,
    children: <SampleContent />,
  },
};

export const WithBreadcrumbsAndActions: Story = {
  args: {
    title: 'Recipe Management',
    subtitle: 'Create and manage your recipes',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Recipes', href: '/recipes' },
      { label: 'Edit Recipe', isCurrentPage: true },
    ],
    actions: (
      <Box>
        <PMButton>Save Recipe</PMButton>
      </Box>
    ),
    children: <SampleContent />,
  },
};

export const FullLayout: Story = {
  args: {
    title: 'Complete Layout',
    subtitle: 'A page with all features enabled',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Analytics', isCurrentPage: true },
    ],
    actions: (
      <Box>
        <PMButton>Export Data</PMButton>
      </Box>
    ),
    sidebar: <SampleSidebar />,
    children: <SampleContent />,
  },
};

export const FullWidth: Story = {
  args: {
    title: 'Full Width Layout',
    subtitle: 'This page uses the full width of the screen',
    isFullWidth: true,
    children: <SampleContent />,
  },
};

export const NoDivider: Story = {
  args: {
    title: 'No Divider',
    subtitle: 'This page does not have a divider after the header',
    children: <SampleContent />,
  },
};

export const MinimalPage: Story = {
  args: {
    title: 'Simple Page',
    children: <SampleContent />,
  },
};
