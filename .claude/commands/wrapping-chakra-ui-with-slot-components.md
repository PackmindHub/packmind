---
description: 'Create slot components to wrap Chakra UI primitives for enhanced custom composition and API consistency in your design system.'
---

Create slot components to wrap Chakra UI primitives for enhanced custom composition and API consistency in your design system.

## When to Use

- When you need to wrap Chakra UI components with custom behavior
- When creating a design system with consistent component APIs
- When you want to add custom logic or styling to Chakra UI slots
- When building complex components like tabs, accordions, or modals that need slot composition

## Context Validation Checkpoints

- [ ] Have you identified which Chakra UI component needs wrapping?
- [ ] Do you know which slots the component has (e.g., Tab Trigger, Tab Content)?
- [ ] Is the SlotComponent type available from packages/ui/src/lib/types/slot.ts?
- [ ] Have you determined what custom props or behavior you need to add?

## Recipe Steps

### Step 1: Understand Slot Component Pattern

For each slot in the Chakra UI component (e.g., Tab Trigger, Tab Content), create a dedicated React component. The slot component should accept all props of the underlying Chakra UI primitive, forward children and props to the Chakra UI primitive, and optionally add custom logic, styling, or context.

### Step 2: Create Slot Component with Proper Typing

Use the SlotComponent type from packages/ui/src/lib/types/slot.ts for proper typing. Use createElement to instantiate the Chakra UI slot component.

```tsx
import { Tabs } from '@chakra-ui/react';
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

// Props are constrained here, depending on the requirements of the component
type PMTabsTriggerProps = {
  value: string;
  children: ReactNode;
};

export const PMTabsTrigger = ({ value, children }: PMTabsTriggerProps) => {
  return createElement(
    Tabs.Trigger as SlotComponent<{ value: string }>,
    { value },
    children,
  );
};
```

### Step 3: Create Additional Slot Components

Create slot components for all slots in the Chakra UI component following the same pattern. Each slot component should be properly typed and use createElement.

```tsx
import { ReactNode, createElement } from 'react';
import { SlotComponent } from '../../../types/slot';

type PMTabsContentProps = {
  value: string;
  children: ReactNode;
};

export const PMTabsContent = ({ value, children }: PMTabsContentProps) => {
  return createElement(
    Tabs.Content as SlotComponent<{ value: string }>,
    { value },
    children,
  );
};
```

### Step 4: Use Slot Components in Wrapper

Use these slot components inside your main wrapper component to compose the UI. This allows you to expose a familiar API for consumers while adding business logic or design tokens at the slot level.

```tsx
<PMTabs defaultValue="tab1" tabs=[
  { value: 'tab1', triggerLabel: 'Tab 1', content: <div>Content 1</div> },
  { value: 'tab2', triggerLabel: 'Tab 2', content: <div>Content 2</div> },
] />
// Internally, PMTabs uses <PMTabsTrigger> and <PMTabsContent> for each slot.
```

### Step 5: Add Custom Props and Logic

Slot components can accept additional props beyond those from Chakra UI, add context or state management, apply custom styling or design tokens, and implement custom validation or behavior.

### Step 6: Export Slot Components

Export all slot components from your component module so they can be used independently if needed, while also being composed into higher-level wrapper components.
