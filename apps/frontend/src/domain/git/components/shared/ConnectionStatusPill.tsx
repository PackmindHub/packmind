import React from 'react';
import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import {
  ConnectionStatusBucket,
  ConnectionStatusView,
  describeFailure,
  toStatusBucket,
} from './connectionStatus';

type BucketVisual = {
  label: string;
  dot: string;
};

const BUCKET_VISUAL: Record<ConnectionStatusBucket, BucketVisual> = {
  connected: { label: 'Connected', dot: 'green.500' },
  checking: { label: 'Checking…', dot: 'gray.400' },
  token_expired: { label: 'Token expired', dot: 'orange.500' },
  unreachable: { label: 'Unreachable', dot: 'red.500' },
  unknown: { label: 'Status unknown', dot: 'yellow.500' },
};

type ConnectionStatusPillProps = {
  view: ConnectionStatusView;
  variant: 'inline' | 'block';
  actions?: React.ReactNode;
};

export const ConnectionStatusPill: React.FC<ConnectionStatusPillProps> = ({
  view,
  variant,
  actions,
}) => {
  const bucket = toStatusBucket(view);
  const { label, dot } = BUCKET_VISUAL[bucket];
  const description = describeFailure(view);

  if (variant === 'inline') {
    return (
      <PMHStack gap={2} align="center" data-status={bucket}>
        <PMBox
          width="8px"
          height="8px"
          borderRadius="full"
          bg={dot}
          flexShrink={0}
          aria-hidden
        />
        <PMText fontSize="xs" color="primary" fontWeight="medium">
          {label}
        </PMText>
      </PMHStack>
    );
  }

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      padding={3}
      bg="background.secondary"
      data-status={bucket}
    >
      <PMVStack gap={2} align="stretch">
        <PMHStack gap={2} align="center">
          <PMBox width="8px" height="8px" borderRadius="full" bg={dot} />
          <PMText fontSize="sm" color="primary" fontWeight="medium">
            {label}
          </PMText>
        </PMHStack>
        {description && (
          <PMText fontSize="xs" color="secondary">
            {description}
          </PMText>
        )}
        {actions}
      </PMVStack>
    </PMBox>
  );
};
