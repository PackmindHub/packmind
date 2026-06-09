import { PMBox, PMHStack, PMIcon, PMText } from '@packmind/ui';
import { LuCircleAlert, LuCircleCheck, LuCircleX } from 'react-icons/lu';
import type { ConnectionStatus } from '../../types';

type StatusVisual = {
  label: string;
  icon: React.ReactNode;
  dot: string;
};

const STATUS_VISUAL: Record<ConnectionStatus, StatusVisual> = {
  connected: {
    label: 'Connected',
    icon: <LuCircleCheck />,
    dot: 'green.500',
  },
  token_expired: {
    label: 'Token expired',
    icon: <LuCircleAlert />,
    dot: 'orange.500',
  },
  unreachable: {
    label: 'Unreachable',
    icon: <LuCircleX />,
    dot: 'red.500',
  },
};

type ConnectionStatusPillProps = {
  status: ConnectionStatus;
  variant?: 'inline' | 'block';
};

export function ConnectionStatusPill({
  status,
  variant = 'inline',
}: Readonly<ConnectionStatusPillProps>) {
  const visual = STATUS_VISUAL[status];

  if (variant === 'block') {
    return (
      <PMHStack
        gap={2}
        align="center"
        paddingX={2.5}
        paddingY={1.5}
        bg="background.tertiary"
        borderRadius="sm"
      >
        <PMIcon fontSize="sm" color={visual.dot}>
          {visual.icon}
        </PMIcon>
        <PMText fontSize="xs" color="primary" fontWeight="medium">
          {visual.label}
        </PMText>
      </PMHStack>
    );
  }

  return (
    <PMHStack gap={2} align="center">
      <PMBox
        width="6px"
        height="6px"
        borderRadius="full"
        bg={visual.dot}
        flexShrink={0}
        aria-hidden
      />
      <PMIcon fontSize="xs" color={visual.dot}>
        {visual.icon}
      </PMIcon>
      <PMText fontSize="xs" color="primary" fontWeight="medium">
        {visual.label}
      </PMText>
    </PMHStack>
  );
}
