import React, { useMemo } from 'react';
import {
  PMBox,
  PMCloseButton,
  PMDrawer,
  PMPortal,
  PMText,
  PMVStack,
  PMSpinner,
} from '@packmind/ui';
import {
  DETECTION_LOG_MESSAGES,
  DetectionLogMessageType,
  ExecutionLogMetadata,
} from '@packmind/types';
import { useGetDetectionProgramMetadataQuery } from '../api/queries/DetectionProgramQueries';

interface ExecutionLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  standardId: string;
  ruleId: string;
  detectionProgramId: string;
}

const LOG_MESSAGE_TRANSLATIONS: Record<
  DetectionLogMessageType,
  (metadata?: ExecutionLogMetadata) => string
> = {
  [DETECTION_LOG_MESSAGES.AI_AGENT_STRATEGY_ASSESSMENT]: () =>
    'Assess the best strategy to detect the practice...',
  [DETECTION_LOG_MESSAGES.AI_AGENT_RESULT_NOT_GOOD_WILL_RESTART]: () =>
    'The generated solution is not accurate, the process will stop...',
  [DETECTION_LOG_MESSAGES.AI_AGENT_RESULT_SUCCESS]: () =>
    'The generated solution provides satisfying results!',
  [DETECTION_LOG_MESSAGES.AI_AGENT_CRASH_RESTART]: () =>
    'The process has stopped...',
  [DETECTION_LOG_MESSAGES.AI_AGENT_PROGRAM_GENERATION_STARTED]: () =>
    'Generation of program has started...',
  [DETECTION_LOG_MESSAGES.AI_AGENT_NEW_PROGRAM_UNDER_TEST]: () =>
    'A new version of the program is now tested...',
  [DETECTION_LOG_MESSAGES.AI_AGENT_PROGRAM_DEBUGGING]: () =>
    'Now enter into a debugging phase with AI Agent to generate a valid program...',
  [DETECTION_LOG_MESSAGES.AI_AGENT_PROGRAM_SUCCESSFUL]: () =>
    'A program has been successfully tested against an existing practice code example',
  [DETECTION_LOG_MESSAGES.AI_AGENT_PROGRAM_TEST_AGAINST_EXAMPLES]: () =>
    'Evaluate program against existing code examples...',
  [DETECTION_LOG_MESSAGES.AI_AGENT_PROGRAM_CHECK_POSITIVE_EXAMPLES]: () =>
    'Now checking against existing positive examples that no violations are found...',
  [DETECTION_LOG_MESSAGES.AI_AGENT_RUN_TEST]: (metadata) => {
    const testName = metadata?.testName || 'Unknown test';
    return `Running test: ${testName}`;
  },
  [DETECTION_LOG_MESSAGES.AI_AGENT_RUN_TEST_NO_NAME]: (metadata) => {
    const testContent = metadata?.testContent;
    return testContent
      ? `Running test with content:\n${testContent}`
      : 'Running test...';
  },
  [DETECTION_LOG_MESSAGES.AI_AGENT_TIMEOUT]: () => 'Operation timed out',
};

const translateLogMessage = (
  message: string,
  metadata?: ExecutionLogMetadata,
): string => {
  const translator =
    LOG_MESSAGE_TRANSLATIONS[message as DetectionLogMessageType];
  if (translator) {
    return translator(metadata);
  }
  return message;
};

const formatLogTimestamp = (timestamp: number): string => {
  const date = new Date(Number(timestamp));
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const ExecutionLogsDrawer: React.FC<ExecutionLogsDrawerProps> = ({
  isOpen,
  onClose,
  standardId,
  ruleId,
  detectionProgramId,
}) => {
  const { data: metadata, isLoading } = useGetDetectionProgramMetadataQuery(
    standardId,
    ruleId,
    detectionProgramId,
    {
      refetchInterval: isOpen ? 5000 : false,
    },
  );

  const sortedLogs = useMemo(() => {
    if (!metadata?.logs) {
      return [];
    }

    return [...metadata.logs].sort((a, b) => a.timestamp - b.timestamp);
  }, [metadata?.logs]);

  const handleOpenChange = ({ open }: { open: boolean }) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <PMDrawer.Root open={isOpen} onOpenChange={handleOpenChange} size="xl">
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMDrawer.Title>Execution Logs</PMDrawer.Title>
            </PMDrawer.Header>
            <PMDrawer.Body>
              <PMBox
                p={4}
                width="full"
                overflowY="auto"
                rounded="md"
                backgroundColor="background.secondary"
              >
                {isLoading ? (
                  <PMSpinner />
                ) : sortedLogs.length === 0 ? (
                  <PMBox p={4}>
                    <PMText color="faded">No execution logs available.</PMText>
                  </PMBox>
                ) : (
                  <PMVStack gap={2} width="full" align="flex-start">
                    {sortedLogs.map((log, index) => (
                      <PMText key={index} fontSize="sm" whiteSpace="pre-wrap">
                        [{formatLogTimestamp(log.timestamp)}] -{' '}
                        {translateLogMessage(log.message, log.metadata)}
                      </PMText>
                    ))}
                  </PMVStack>
                )}
              </PMBox>
            </PMDrawer.Body>
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};
