import type { Meta } from '@storybook/react';
import { PMCopiable } from './PMCopiable';
import { PMInput } from '../../form/PMInput/PMInput';
import { PMTextArea } from '../../form/PMTextArea/PMTextArea';
import { PMInputGroup } from '../../form/PMInputGroup/PMInputGroup';
import { PMIconButton } from '../../form/PMIconButton/PMIconButton';
import { PMButton } from '../../form/PMButton/PMButton';
import { PMVStack } from '../../layout/PMVStack/PMVStack';
import { PMText } from '../../typography/PMText';
import { Box } from '@chakra-ui/react';
import { LuCopy } from 'react-icons/lu';

const meta: Meta<typeof PMCopiable.Root> = {
  title: 'Feedback/PMCopiable',
  component: PMCopiable.Root,
  parameters: {
    layout: 'centered',
  },
};
export default meta;

export const Basic = () => (
  <PMCopiable.Root value="Hello, world!">
    <PMCopiable.Trigger asChild>
      <PMButton variant="surface" size="sm">
        <PMCopiable.Indicator>
          <LuCopy />
        </PMCopiable.Indicator>
        Copy Text
      </PMButton>
    </PMCopiable.Trigger>
  </PMCopiable.Root>
);

export const WithInput = () => (
  <PMVStack gap={4} width="400px">
    <PMText variant="small" color="primary" fontWeight="medium">
      API Endpoint URL
    </PMText>
    <PMCopiable.Root value="https://api.example.com/v1/users">
      <PMInputGroup
        endElement={
          <PMCopiable.Trigger asChild>
            <PMIconButton
              aria-label="Copy to clipboard"
              variant="surface"
              size="xs"
              me="-2"
            >
              <PMCopiable.Indicator>
                <LuCopy />
              </PMCopiable.Indicator>
            </PMIconButton>
          </PMCopiable.Trigger>
        }
      >
        <PMInput
          value="https://api.example.com/v1/users"
          readOnly
          placeholder="Enter URL"
        />
      </PMInputGroup>
    </PMCopiable.Root>
  </PMVStack>
);

export const WithTextArea = () => (
  <PMVStack gap={4} width="500px">
    <PMText variant="small" color="primary" fontWeight="medium">
      Configuration JSON (Hover to see copy button)
    </PMText>
    <PMCopiable.Root
      value={JSON.stringify(
        {
          name: 'packmind-server',
          command: 'npx',
          args: ['@packmind/mcp-server'],
          env: {
            PACKMIND_API_TOKEN: 'your-token-here',
          },
        },
        null,
        2,
      )}
    >
      <Box position="relative" _hover={{ '& .copy-button': { opacity: 1 } }}>
        <PMTextArea
          value={JSON.stringify(
            {
              name: 'packmind-server',
              command: 'npx',
              args: ['@packmind/mcp-server'],
              env: {
                PACKMIND_API_TOKEN: 'your-token-here',
              },
            },
            null,
            2,
          )}
          readOnly
          rows={8}
        />
        <PMCopiable.Trigger asChild>
          <PMIconButton
            className="copy-button"
            aria-label="Copy to clipboard"
            variant="surface"
            size="xs"
            position="absolute"
            top={2}
            right={2}
            opacity={0}
            transition="opacity 0.2s"
            zIndex={1}
          >
            <PMCopiable.Indicator>
              <LuCopy />
            </PMCopiable.Indicator>
          </PMIconButton>
        </PMCopiable.Trigger>
      </Box>
    </PMCopiable.Root>
  </PMVStack>
);

export const IconButton = () => (
  <PMCopiable.Root value="Copy me!">
    <PMCopiable.Trigger asChild>
      <PMIconButton aria-label="Copy to clipboard" variant="surface" size="sm">
        <PMCopiable.Indicator>
          <LuCopy />
        </PMCopiable.Indicator>
      </PMIconButton>
    </PMCopiable.Trigger>
  </PMCopiable.Root>
);

export const CustomIndicator = () => (
  <PMCopiable.Root value="Custom indicator example">
    <PMCopiable.Trigger asChild>
      <PMButton variant="surface" size="sm">
        <PMCopiable.Indicator copied="✅ Copied!">
          <LuCopy /> Copy
        </PMCopiable.Indicator>
      </PMButton>
    </PMCopiable.Trigger>
  </PMCopiable.Root>
);

export const AllVariants = () => (
  <PMVStack gap={6} width="500px">
    <div>
      <PMText variant="small" color="primary" fontWeight="medium" mb={2}>
        Basic Button
      </PMText>
      <PMCopiable.Root value="Basic copy example">
        <PMCopiable.Trigger asChild>
          <PMButton variant="surface" size="sm">
            <PMCopiable.Indicator>
              <LuCopy />
            </PMCopiable.Indicator>
            Copy
          </PMButton>
        </PMCopiable.Trigger>
      </PMCopiable.Root>
    </div>

    <div>
      <PMText variant="small" color="primary" fontWeight="medium" mb={2}>
        Icon Button
      </PMText>
      <PMCopiable.Root value="Icon button example">
        <PMCopiable.Trigger asChild>
          <PMIconButton
            aria-label="Copy to clipboard"
            variant="surface"
            size="sm"
          >
            <PMCopiable.Indicator>
              <LuCopy />
            </PMCopiable.Indicator>
          </PMIconButton>
        </PMCopiable.Trigger>
      </PMCopiable.Root>
    </div>

    <div>
      <PMText variant="small" color="primary" fontWeight="medium" mb={2}>
        With Input Field
      </PMText>
      <PMCopiable.Root value="https://example.com/api/token">
        <PMInputGroup
          endElement={
            <PMCopiable.Trigger asChild>
              <PMIconButton
                aria-label="Copy to clipboard"
                variant="surface"
                size="xs"
                me="-2"
              >
                <PMCopiable.Indicator>
                  <LuCopy />
                </PMCopiable.Indicator>
              </PMIconButton>
            </PMCopiable.Trigger>
          }
        >
          <PMInput value="https://example.com/api/token" readOnly />
        </PMInputGroup>
      </PMCopiable.Root>
    </div>
  </PMVStack>
);
