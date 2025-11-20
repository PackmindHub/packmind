import React, { useState, useCallback } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMText,
  PMTextArea,
  PMVStack,
} from '@packmind/ui';
import { LuPencil, LuX, LuCheck } from 'react-icons/lu';

interface HeuristicsEditorProps {
  value: string;
  onSubmit: (text: string) => Promise<void> | void;
  isLoading?: boolean;
  isEditable: boolean;
  maxLength?: number;
  rows?: number;
}

export const HeuristicsEditor: React.FC<HeuristicsEditorProps> = ({
  value,
  onSubmit,
  isLoading = false,
  isEditable,
  maxLength = 3000,
  rows = 5,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleEditClick = useCallback(() => {
    setEditValue(value);
    setIsEditMode(true);
  }, [value]);

  const handleCancelClick = useCallback(() => {
    setEditValue('');
    setIsEditMode(false);
  }, []);

  const handleSubmitClick = useCallback(async () => {
    await onSubmit(editValue);
    setIsEditMode(false);
    setEditValue('');
  }, [editValue, onSubmit]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditValue(e.target.value);
    },
    [],
  );

  return (
    <PMBox
      borderRadius="md"
      borderWidth={1}
      borderColor="border.tertiary"
      p={3}
      width="full"
      height="full"
    >
      <PMVStack width="full" height="full" gap={3} align="flex-start">
        {!isEditMode ? (
          <>
            {isEditable && (
              <PMHStack width="full" justify="space-between" align="center">
                <PMText fontWeight="medium">Clues</PMText>
                <PMButton
                  size="xs"
                  variant="ghost"
                  onClick={handleEditClick}
                  aria-label="Edit heuristics"
                >
                  <PMIcon size="xs">
                    <LuPencil />
                  </PMIcon>
                </PMButton>
              </PMHStack>
            )}
            <PMText whiteSpace="pre-wrap" width="full" color="secondary">
              {value || 'No clues defined yet...'}
            </PMText>
          </>
        ) : (
          <>
            <PMHStack
              width="full"
              justify="space-between"
              align="center"
              gap={2}
            >
              <PMText fontWeight="medium">Clues</PMText>
              <PMHStack gap={2}>
                <PMButton
                  size="xs"
                  variant="ghost"
                  onClick={handleCancelClick}
                  disabled={isLoading}
                  aria-label="Cancel editing"
                >
                  <PMIcon size="xs">
                    <LuX />
                  </PMIcon>
                </PMButton>
                <PMButton
                  size="xs"
                  onClick={handleSubmitClick}
                  loading={isLoading}
                  disabled={isLoading}
                  aria-label="Submit heuristics"
                >
                  <PMIcon size="xs">
                    <LuCheck />
                  </PMIcon>
                </PMButton>
              </PMHStack>
            </PMHStack>
            <PMTextArea
              value={editValue}
              onChange={handleTextChange}
              placeholder="Enter detection heuristics..."
              rows={rows}
              disabled={isLoading}
              maxLength={maxLength}
              width="full"
            />
          </>
        )}
      </PMVStack>
    </PMBox>
  );
};
