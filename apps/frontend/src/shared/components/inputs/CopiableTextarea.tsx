import React from 'react';
import {
  PMTextArea,
  IPMTextAreaProps,
  PMCopiable,
  PMIconButton,
} from '@packmind/ui';
import { PMBox } from '@packmind/ui';
import { LuCopy } from 'react-icons/lu';

interface CopiableTextareaProps extends Omit<IPMTextAreaProps, 'value'> {
  value: string;
  onValueChange?: (value: string) => void;
  readOnly?: boolean;
}

export const CopiableTextarea: React.FunctionComponent<
  CopiableTextareaProps
> = ({ value, onValueChange, readOnly = false, ...textareaProps }) => {
  return (
    <PMCopiable.Root value={value} width={'full'}>
      <PMBox position="relative" _hover={{ '& .copy-button': { opacity: 1 } }}>
        <PMTextArea
          value={value}
          onChange={(e) => !readOnly && onValueChange?.(e.target.value)}
          readOnly={readOnly}
          {...textareaProps}
        />
        <PMCopiable.Trigger asChild>
          <PMIconButton
            className="copy-button"
            aria-label="Copy to clipboard"
            variant="surface"
            size="xs"
            position="absolute"
            top={2}
            right={2}
            opacity={0}
            transition="opacity 0.2s"
            zIndex={1}
          >
            <PMCopiable.Indicator>
              <LuCopy />
            </PMCopiable.Indicator>
          </PMIconButton>
        </PMCopiable.Trigger>
      </PMBox>
    </PMCopiable.Root>
  );
};
