import { Select as ChakraSelect, createListCollection } from '@chakra-ui/react';
import * as React from 'react';
import { PMIcon } from '../../content';
import { LuChevronDown } from 'react-icons/lu';

export const PMSelectTrigger = React.forwardRef<
  HTMLButtonElement,
  ChakraSelect.TriggerProps & { placeholder?: string }
>(function PMSelectTrigger(
  { placeholder = 'Select an option', ...props },
  ref,
) {
  return (
    <ChakraSelect.Trigger
      ref={ref}
      {...props}
      backgroundColor="background.primary"
    >
      <ChakraSelect.ValueText placeholder={placeholder} />
      <PMIcon>
        <LuChevronDown />
      </PMIcon>
    </ChakraSelect.Trigger>
  );
});

const PMSelectItemGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ChakraSelect.ItemGroupLabel>
>(function PMSelectItemGroupLabel(props, ref) {
  return (
    <ChakraSelect.ItemGroupLabel
      ref={ref}
      color="text.faded"
      paddingY={2}
      paddingX={2}
      backgroundColor="background.primary"
      {...props}
    />
  );
});

const CollapsibleItemGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ChakraSelect.ItemGroup> & {
    label: React.ReactNode;
  }
>(function CollapsibleItemGroup({ label, children, ...props }, ref) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <ChakraSelect.ItemGroup ref={ref} {...props}>
      <PMSelectItemGroupLabel
        onClick={handleToggle}
        cursor="pointer"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        {label}
        <PMIcon
          transform={isOpen ? 'rotate(180deg)' : undefined}
          transition="transform 0.2s"
        >
          <LuChevronDown />
        </PMIcon>
      </PMSelectItemGroupLabel>
      {isOpen && children}
    </ChakraSelect.ItemGroup>
  );
});

export const PMSelect = {
  ...ChakraSelect,
  ItemGroupLabel: PMSelectItemGroupLabel,
  CollapsibleItemGroup,
};

export const pmCreateListCollection = createListCollection;
