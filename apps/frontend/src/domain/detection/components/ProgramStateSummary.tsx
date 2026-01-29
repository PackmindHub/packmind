import React from 'react';
import {
  PMHStack,
  PMIcon,
  PMText,
  PMBadge,
  PMTooltip,
  PMMenu,
  PMVStack,
} from '@packmind/ui';
import { LuCircleAlert, LuCircleCheck, LuCheck } from 'react-icons/lu';
import { FaChevronDown } from 'react-icons/fa';
import { DetectionStatus } from '@packmind/types';

interface ProgramStateSummaryProps {
  version?: number;
  status?: DetectionStatus;
  isToReview?: boolean;
  hasDraftAvailable?: boolean;
  showDropdown?: boolean;
  createdAt?: Date;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ProgramStateSummary: React.FC<ProgramStateSummaryProps> = ({
  version,
  status,
  isToReview,
  hasDraftAvailable,
  showDropdown = false,
  createdAt,
}) => {
  if (!version || !status) {
    return (
      <PMText fontSize="sm" color="faded">
        No active configuration
      </PMText>
    );
  }

  return (
    <PMHStack gap={2} alignItems="center">
      <PMText fontSize="sm" color="secondary">
        v{version}
      </PMText>

      {status === DetectionStatus.READY &&
        !isToReview &&
        (showDropdown ? (
          <PMMenu.Root>
            <PMMenu.Trigger asChild>
              <PMBadge
                colorPalette="green"
                size="sm"
                cursor="pointer"
                _hover={{ opacity: 0.8 }}
              >
                <PMHStack gap={1} alignItems="center">
                  Active
                  <PMIcon size="xs" as={FaChevronDown} />
                </PMHStack>
              </PMBadge>
            </PMMenu.Trigger>
            <PMMenu.Content>
              <PMVStack gap={0} alignItems="stretch">
                <PMMenu.Item value="status" disabled>
                  <PMHStack gap={2}>
                    <PMIcon color="text.success">
                      <LuCheck />
                    </PMIcon>
                    <PMText fontWeight="medium">Active</PMText>
                  </PMHStack>
                </PMMenu.Item>
                <PMMenu.Separator />
                <PMMenu.Item value="version" disabled>
                  <PMVStack gap={1} alignItems="flex-start">
                    <PMText fontSize="xs" fontWeight="medium" color="secondary">
                      Version
                    </PMText>
                    <PMText fontSize="sm">{version}</PMText>
                  </PMVStack>
                </PMMenu.Item>
                {createdAt && (
                  <PMMenu.Item value="generation" disabled>
                    <PMVStack gap={1} alignItems="flex-start">
                      <PMText
                        fontSize="xs"
                        fontWeight="medium"
                        color="secondary"
                      >
                        Generation details
                      </PMText>
                      <PMText fontSize="sm">{formatDate(createdAt)}</PMText>
                    </PMVStack>
                  </PMMenu.Item>
                )}
              </PMVStack>
            </PMMenu.Content>
          </PMMenu.Root>
        ) : (
          <PMBadge colorPalette="green" size="sm">
            Active
          </PMBadge>
        ))}

      {isToReview && (
        <PMTooltip
          label="Active program needs review. Rule specifications have changed."
          placement="top"
        >
          <PMHStack gap={1} alignItems="center">
            <PMIcon color="text.warning" size="xs">
              <LuCircleAlert />
            </PMIcon>
            <PMBadge colorPalette="orange" size="sm">
              To Review
            </PMBadge>
          </PMHStack>
        </PMTooltip>
      )}

      {hasDraftAvailable && !isToReview && (
        <PMTooltip label="New draft available for review" placement="top">
          <PMHStack gap={1} alignItems="center">
            <PMIcon color="text.success" size="xs">
              <LuCircleCheck />
            </PMIcon>
            <PMBadge colorPalette="gray" size="sm">
              Draft Available
            </PMBadge>
          </PMHStack>
        </PMTooltip>
      )}
    </PMHStack>
  );
};
