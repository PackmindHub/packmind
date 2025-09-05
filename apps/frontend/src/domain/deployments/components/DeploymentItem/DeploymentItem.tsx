import React from 'react';
import { PMBox, PMHeading, PMHStack, PMVStack, PMText } from '@packmind/ui';

interface DeploymentItemProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
}

export const DeploymentItem: React.FC<DeploymentItemProps> = ({
  title,
  children,
}) => (
  <PMBox>
    <PMBox mb={2}>
      <PMHeading level="h5">{title}</PMHeading>
    </PMBox>
    <PMVStack gap={2} align="stretch">
      {children}
    </PMVStack>
  </PMBox>
);

interface DeploymentEntryProps {
  name: string | React.ReactNode;
  versionInfo: string;
}

export const DeploymentEntry: React.FC<DeploymentEntryProps> = ({
  name,
  versionInfo,
}) => (
  <PMHStack justify="space-between">
    <PMVStack align="start" gap={1}>
      <PMText variant="body">{name}</PMText>
      <PMText variant="small" color="faded">
        {versionInfo}
      </PMText>
    </PMVStack>
  </PMHStack>
);
