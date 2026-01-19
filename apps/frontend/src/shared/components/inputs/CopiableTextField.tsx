import React from 'react';
import {
  PMInput,
  IPMInputProps,
  PMText,
  PMInputGroup,
  PMCopiable,
  PMIconButton,
} from '@packmind/ui';
import { LuCopy } from 'react-icons/lu';

interface CopiableTextFieldProps extends Omit<IPMInputProps, 'value'> {
  value: string;
  onValueChange?: (value: string) => void;
  label?: string;
  readOnly?: boolean;
  onInteraction?: () => void;
}

export const CopiableTextField: React.FunctionComponent<
  CopiableTextFieldProps
> = ({
  value,
  onValueChange,
  label,
  readOnly = false,
  onInteraction,
  ...inputProps
}) => {
  return (
    <>
      {label && (
        <PMText
          variant="small"
          color="primary"
          as="p"
          style={{
            fontWeight: 'medium',
            marginBottom: '4px',
            display: 'inline-block',
          }}
        >
          {label}
        </PMText>
      )}
      <PMCopiable.Root value={value}>
        <PMInputGroup
          endElement={
            <PMCopiable.Trigger asChild>
              <PMIconButton
                aria-label="Copy to clipboard"
                variant="surface"
                size="xs"
                me="-2"
                onClick={onInteraction}
              >
                <PMCopiable.Indicator>
                  <LuCopy />
                </PMCopiable.Indicator>
              </PMIconButton>
            </PMCopiable.Trigger>
          }
        >
          <PMInput
            value={value}
            onChange={(e) => !readOnly && onValueChange?.(e.target.value)}
            readOnly={readOnly}
            onClick={onInteraction}
            onSelect={onInteraction}
            {...inputProps}
          />
        </PMInputGroup>
      </PMCopiable.Root>
    </>
  );
};
