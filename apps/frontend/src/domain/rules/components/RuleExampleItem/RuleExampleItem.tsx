import React, { useState } from 'react';
import { RuleExample } from '@packmind/standards/types';
import { RuleId } from '@packmind/shared/types';
import {
  ProgrammingLanguage,
  getAllLanguagesSortedByDisplayName,
} from '@packmind/shared/types';
import {
  useUpdateRuleExampleMutation,
  useDeleteRuleExampleMutation,
} from '../../api/queries';
import {
  PMCodeMirror,
  PMText,
  PMHeading,
  PMButton,
  PMHStack,
  PMVStack,
  PMBox,
  PMFlex,
  PMButtonGroup,
  PMBadge,
  PMIcon,
  PMGrid,
  PMGridItem,
  PMNativeSelect,
} from '@packmind/ui';
import { LuCircleCheckBig, LuCircleX } from 'react-icons/lu';

interface RuleExampleItemProps {
  example: RuleExample;
  standardId: string;
  ruleId: RuleId;
}

export const RuleExampleItem: React.FC<RuleExampleItemProps> = ({
  example,
  standardId,
  ruleId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    lang: example.lang,
    positive: example.positive,
    negative: example.negative,
  });

  const updateMutation = useUpdateRuleExampleMutation();
  const deleteMutation = useDeleteRuleExampleMutation();

  // Get sorted languages for the dropdown
  const sortedLanguages = getAllLanguagesSortedByDisplayName();
  const languageOptions = sortedLanguages.map(({ language, info }) => ({
    value: language,
    label: info.displayName,
  }));

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      updateMutation.mutate({
        standardId,
        ruleId,
        exampleId: example.id,
        updates: editValues,
      });
    } else {
      // Reset values when starting to edit
      setEditValues({
        lang: example.lang,
        positive: example.positive,
        negative: example.negative,
      });
    }
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setEditValues({
      lang: example.lang,
      positive: example.positive,
      negative: example.negative,
    });
    setIsEditing(false);
  };

  const handleRemove = () => {
    deleteMutation.mutate({
      standardId,
      ruleId,
      exampleId: example.id,
    });
  };

  return (
    <PMBox
      border="1px solid"
      borderColor="{colors.border.primary}"
      borderRadius="md"
      width="100%"
      p={4}
      shadow="sm"
    >
      {/* Header */}
      <PMFlex justify="space-between" align="center" mb={4}>
        <PMHStack>
          <PMText>Language:</PMText>
          {isEditing ? (
            <PMNativeSelect
              value={editValues.lang}
              onChange={(e) =>
                setEditValues((prev) => ({
                  ...prev,
                  lang: e.target.value as ProgrammingLanguage,
                }))
              }
              items={languageOptions}
              size="sm"
            />
          ) : (
            <PMBadge colorPalette={'blue'} size={'lg'}>
              {sortedLanguages.find(({ language }) => language === example.lang)
                ?.info.displayName || example.lang}
            </PMBadge>
          )}
        </PMHStack>
        {isEditing ? (
          <PMButtonGroup size="sm">
            <PMButton variant="tertiary" onClick={handleCancel}>
              Cancel
            </PMButton>
            <PMButton variant="primary" onClick={handleEditToggle}>
              Save
            </PMButton>
          </PMButtonGroup>
        ) : (
          <PMButtonGroup size="sm">
            <PMButton
              variant="secondary"
              onClick={handleEditToggle}
              aria-label={isEditing ? 'Save changes' : 'Edit example'}
            >
              Edit
            </PMButton>
            <PMButton
              variant="tertiary"
              onClick={handleRemove}
              aria-label="Remove example"
            >
              Delete
            </PMButton>
          </PMButtonGroup>
        )}
      </PMFlex>

      {/* Code Examples Side by Side */}
      <PMGrid gridTemplateColumns={'repeat(2, minmax(0, 1fr))'} gap={4}>
        <PMGridItem>
          {/* Positive Example */}
          <PMVStack flex={1} align="stretch" gap={2}>
            <PMHeading level="h5">
              <PMIcon color="green.500" marginRight={'1'}>
                <LuCircleCheckBig />
              </PMIcon>
              Do
            </PMHeading>
            <PMBox>
              <PMCodeMirror
                value={isEditing ? editValues.positive : example.positive}
                onChange={(value: string) =>
                  setEditValues((prev) => ({ ...prev, positive: value }))
                }
                readOnly={!isEditing}
                language={example.lang}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: false,
                  searchKeymap: false,
                }}
                style={{
                  opacity: isEditing ? 1 : 0.8,
                  cursor: isEditing ? 'text' : 'default',
                }}
              />
            </PMBox>
          </PMVStack>
        </PMGridItem>
        <PMGridItem>
          {/* Negative Example */}
          <PMVStack flex={1} align="stretch" gap={2}>
            <PMHeading level="h5">
              <PMIcon color="red.500" marginRight={'1'}>
                <LuCircleX />
              </PMIcon>
              Don't
            </PMHeading>
            <PMBox>
              <PMCodeMirror
                value={isEditing ? editValues.negative : example.negative}
                onChange={(value: string) =>
                  setEditValues((prev) => ({ ...prev, negative: value }))
                }
                readOnly={!isEditing}
                language={example.lang}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: false,
                  searchKeymap: false,
                }}
                style={{
                  opacity: isEditing ? 1 : 0.8,
                  cursor: isEditing ? 'text' : 'default',
                }}
              />
            </PMBox>
          </PMVStack>
        </PMGridItem>
      </PMGrid>
    </PMBox>
  );
};
