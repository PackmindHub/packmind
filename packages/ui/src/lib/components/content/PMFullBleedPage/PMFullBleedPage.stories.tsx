import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Flex } from '@chakra-ui/react';
import { PMFullBleedPage } from './PMFullBleedPage';
import { PMHeading } from '../../typography/PMHeading';
import { PMText } from '../../typography/PMText';

const meta: Meta<typeof PMFullBleedPage> = {
  title: 'Layout/PMFullBleedPage',
  component: PMFullBleedPage,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof PMFullBleedPage>;

/**
 * A rail beside a pane, each scrolling on its own, with the page itself not
 * scrolling at all. The long column is there to show that the height is the
 * shell's and the overflow is the column's.
 */
const RailAndPane = () => (
  <Flex height="100%" align="stretch" gap={0}>
    <Box
      width="280px"
      flexShrink={0}
      overflowY="auto"
      borderRightWidth="1px"
      borderColor="border.tertiary"
      padding={4}
    >
      {Array.from({ length: 40 }, (_, index) => (
        <PMText key={index}>Item {index + 1}</PMText>
      ))}
    </Box>
    <Box flex="1" minWidth={0} overflowY="auto" padding={6}>
      <PMHeading level="h3">Pane</PMHeading>
      <PMText>
        The surface owns the whole content area, and says where the reader is
        through its own content rather than through a page heading.
      </PMText>
    </Box>
  </Flex>
);

export const Default: Story = {
  render: () => (
    <Box height="100vh">
      <PMFullBleedPage>
        <RailAndPane />
      </PMFullBleedPage>
    </Box>
  ),
};
