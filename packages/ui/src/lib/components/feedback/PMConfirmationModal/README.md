# PMConfirmationModal

A reusable confirmation modal component that follows the Packmind slot component pattern for wrapping Chakra UI Dialog components. This component is specifically designed for prompting users before performing destructive actions like deletions.

## Features

- **Slot Component Pattern**: Built with dedicated slot components for header, body, and footer
- **Accessibility**: Proper focus management and ARIA attributes
- **Customizable**: Flexible API for different confirmation scenarios
- **Loading States**: Built-in loading state support for async operations
- **TypeScript Support**: Fully typed with comprehensive prop interfaces

## Usage

### Basic Usage

```tsx
import { PMConfirmationModal, PMButton } from '@packmind/ui';

function DeleteItemButton() {
  const handleDelete = () => {
    // Perform delete operation
    console.log('Item deleted!');
  };

  return (
    <PMConfirmationModal
      trigger={<PMButton colorScheme="red">Delete Item</PMButton>}
      title="Delete Item"
      message="Are you sure you want to delete this item? This action cannot be undone."
      onConfirm={handleDelete}
    />
  );
}
```

### With Custom Button Text

```tsx
<PMConfirmationModal
  trigger={<PMButton colorScheme="orange">Remove User</PMButton>}
  title="Remove User"
  message="This will permanently remove the user from your organization."
  confirmText="Remove"
  cancelText="Keep User"
  confirmColorScheme="orange"
  onConfirm={handleRemoveUser}
/>
```

### Controlled Modal with Loading State

```tsx
function ControlledExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await deleteItemAsync();
      setIsOpen(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PMConfirmationModal
      trigger={<PMButton colorScheme="red">Delete with Loading</PMButton>}
      title="Delete Item"
      message="This operation may take a moment..."
      open={isOpen}
      onOpenChange={setIsOpen}
      isLoading={isLoading}
      onConfirm={handleConfirm}
    />
  );
}
```

## Props

### PMConfirmationModalProps

| Prop                 | Type                      | Default    | Description                                 |
| -------------------- | ------------------------- | ---------- | ------------------------------------------- |
| `trigger`            | `ReactNode`               | -          | The trigger element that opens the modal    |
| `title`              | `string`                  | -          | Title displayed in the modal header         |
| `message`            | `string`                  | -          | Message displayed in the modal body         |
| `confirmText`        | `string`                  | `"Delete"` | Text for the confirm button                 |
| `cancelText`         | `string`                  | `"Cancel"` | Text for the cancel button                  |
| `confirmColorScheme` | `string`                  | `"red"`    | Color scheme for the confirm button         |
| `onConfirm`          | `() => void`              | -          | Callback function called when user confirms |
| `open`               | `boolean`                 | -          | Whether the modal is open (controlled mode) |
| `onOpenChange`       | `(open: boolean) => void` | -          | Callback for modal state changes            |
| `isLoading`          | `boolean`                 | `false`    | Whether the confirm action is loading       |

## Slot Components

The component is built with the following slot components that can be used independently for advanced customization:

- `PMConfirmationModalHeader`: Modal header with title
- `PMConfirmationModalBody`: Modal body with message content
- `PMConfirmationModalFooter`: Modal footer with action buttons

### Advanced Usage with Slot Components

```tsx
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  PMConfirmationModalHeader,
  PMConfirmationModalBody,
  PMConfirmationModalFooter,
  PMButton,
} from '@packmind/ui';

function AdvancedModal() {
  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <PMButton>Custom Modal</PMButton>
      </DialogTrigger>

      <DialogContent>
        <PMConfirmationModalHeader>
          Custom Title with Icons
        </PMConfirmationModalHeader>

        <PMConfirmationModalBody>
          <div>
            <p>Custom content with multiple paragraphs.</p>
            <p>You can add any React elements here.</p>
          </div>
        </PMConfirmationModalBody>

        <PMConfirmationModalFooter>
          <PMButton variant="outline">Custom Cancel</PMButton>
          <PMButton colorScheme="blue">Custom Confirm</PMButton>
        </PMConfirmationModalFooter>
      </DialogContent>
    </DialogRoot>
  );
}
```

## Accessibility

The component follows accessibility best practices:

- **Focus Management**: Automatically focuses the cancel button when opened (least destructive action)
- **ARIA Attributes**: Proper dialog roles and labeling
- **Keyboard Navigation**: Supports Escape key to close and Tab navigation
- **Screen Reader Support**: Proper semantic structure for assistive technologies

## Design Patterns

This component follows the Packmind slot component pattern as described in the [Wrapping Chakra UI with Slot Components recipe](.packmind/recipes/wrapping-chakra-ui-with-slot-components.md).
