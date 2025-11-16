import React from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMCodeMirror,
  PMHeading,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { CodeExample, TopicId } from '@packmind/types';
import { useTopicQuery } from '../api/queries/LearningsQueries';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';

interface TopicDetailsProps {
  topicId: TopicId;
}

export const TopicDetails = ({ topicId }: TopicDetailsProps) => {
  const { data, isLoading, isError } = useTopicQuery(topicId);

  if (isLoading) {
    return <PMBox>Loading topic details...</PMBox>;
  }

  if (isError || !data || !data.topic) {
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Title>Failed to load topic details</PMAlert.Title>
        <PMAlert.Description>
          An error occurred while fetching the topic
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  const topic = data.topic;

  return (
    <PMVStack align="stretch" gap={6}>
      {/* Topic Title */}
      <PMBox>
        <PMHeading size="lg">{topic.title}</PMHeading>
      </PMBox>

      {/* Topic Metadata */}
      <PMBox p={4} borderWidth="1px" borderRadius="md">
        <PMVStack align="stretch" gap={2}>
          {topic.createdAt && (
            <PMText>
              <strong>Created:</strong>{' '}
              {new Date(topic.createdAt).toLocaleString()}
            </PMText>
          )}
          <PMText>
            <strong>Created By:</strong> {topic.createdBy}
          </PMText>
          <PMText>
            <strong>Capture Context:</strong> {topic.captureContext}
          </PMText>
        </PMVStack>
      </PMBox>

      {/* Topic Content */}
      <PMBox p={4} borderWidth="1px" borderRadius="md">
        <PMHeading size="sm" mb={4}>
          Content
        </PMHeading>
        <MarkdownEditorProvider>
          <MarkdownEditor defaultValue={topic.content} readOnly />
        </MarkdownEditorProvider>
      </PMBox>

      {/* Code Examples */}
      {topic.codeExamples && topic.codeExamples.length > 0 && (
        <PMBox p={4} borderWidth="1px" borderRadius="md">
          <PMHeading size="sm" mb={4}>
            Code Examples
          </PMHeading>
          <PMVStack align="stretch" gap={4}>
            {topic.codeExamples.map((example: CodeExample, index: number) => (
              <PMBox key={index}>
                <PMText mb={2} fontWeight="bold">
                  Example {index + 1} ({example.language})
                </PMText>
                <PMCodeMirror
                  value={example.code}
                  language={example.language}
                  readOnly
                  height="auto"
                />
              </PMBox>
            ))}
          </PMVStack>
        </PMBox>
      )}
    </PMVStack>
  );
};
