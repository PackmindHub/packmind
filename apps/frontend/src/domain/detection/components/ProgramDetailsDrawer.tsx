import React, { useMemo } from 'react';
import {
  PMBox,
  PMCloseButton,
  PMDrawer,
  PMPortal,
  PMText,
  PMVStack,
  PMSpinner,
  PMCodeMirror,
  PMMarkdownViewer,
  PMAccordion,
} from '@packmind/ui';
import {
  DETECTION_LOG_MESSAGES,
  DetectionLogMessageType,
  ExecutionLogMetadata,
} from '@packmind/types';
import { useGetDetectionProgramMetadataQuery } from '../api/queries/DetectionProgramQueries';

interface ProgramDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  standardId: string;
  ruleId: string;
  detectionProgramId: string;
  programCode: string;
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

export const ProgramDetailsDrawer: React.FC<ProgramDetailsDrawerProps> = ({
  isOpen,
  onClose,
  standardId,
  ruleId,
  detectionProgramId,
  programCode,
}) => {
  const { data: metadata, isLoading } = useGetDetectionProgramMetadataQuery(
    standardId,
    ruleId,
    detectionProgramId,
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
              <PMDrawer.Title>Program Details</PMDrawer.Title>
            </PMDrawer.Header>
            <PMDrawer.Body>
              {isLoading ? (
                <PMBox display="flex" justifyContent="center" p={8}>
                  <PMSpinner />
                </PMBox>
              ) : (
                <PMVStack gap={4} width="full">
                  <PMAccordion.Root collapsible defaultValue={['logs']}>
                    {/* Execution Logs Section */}
                    <PMAccordion.Item value="logs">
                      <PMAccordion.ItemTrigger>
                        <PMText fontWeight="semibold">Execution Logs</PMText>
                        <PMAccordion.ItemIndicator />
                      </PMAccordion.ItemTrigger>
                      <PMAccordion.ItemContent>
                        <PMBox
                          p={4}
                          width="full"
                          maxHeight="300px"
                          overflowY="auto"
                          rounded="md"
                          backgroundColor="background.secondary"
                        >
                          {sortedLogs.length === 0 ? (
                            <PMText color="faded">
                              No execution logs available.
                            </PMText>
                          ) : (
                            <PMVStack gap={2} width="full" align="flex-start">
                              {sortedLogs.map((log, index) => (
                                <PMText
                                  key={index}
                                  fontSize="sm"
                                  whiteSpace="pre-wrap"
                                >
                                  [{formatLogTimestamp(log.timestamp)}] -{' '}
                                  {translateLogMessage(
                                    log.message,
                                    log.metadata,
                                  )}
                                </PMText>
                              ))}
                            </PMVStack>
                          )}
                        </PMBox>
                      </PMAccordion.ItemContent>
                    </PMAccordion.Item>

                    {/* Program Information Section */}
                    {metadata?.programDescription && (
                      <PMAccordion.Item value="info">
                        <PMAccordion.ItemTrigger>
                          <PMText fontWeight="semibold">
                            Program Information
                          </PMText>
                          <PMAccordion.ItemIndicator />
                        </PMAccordion.ItemTrigger>
                        <PMAccordion.ItemContent>
                          <PMBox p={4}>
                            <PMMarkdownViewer
                              content={metadata.programDescription}
                            />
                          </PMBox>
                        </PMAccordion.ItemContent>
                      </PMAccordion.Item>
                    )}

                    {/* Program Code Section */}
                    <PMAccordion.Item value="code">
                      <PMAccordion.ItemTrigger>
                        <PMText fontWeight="semibold">Program Code</PMText>
                        <PMAccordion.ItemIndicator />
                      </PMAccordion.ItemTrigger>
                      <PMAccordion.ItemContent>
                        <PMBox width="full">
                          {!programCode || programCode.trim() === '' ? (
                            <PMBox p={4}>
                              <PMText color="faded">
                                No program content available.
                              </PMText>
                            </PMBox>
                          ) : (
                            <PMCodeMirror
                              value={programCode}
                              editable={false}
                              language="javascript"
                              height="400px"
                              basicSetup={{
                                lineNumbers: true,
                                foldGutter: false,
                                dropCursor: false,
                                allowMultipleSelections: false,
                              }}
                            />
                          )}
                        </PMBox>
                      </PMAccordion.ItemContent>
                    </PMAccordion.Item>
                  </PMAccordion.Root>
                </PMVStack>
              )}
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
