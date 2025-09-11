# PMAlertDialog

A reusable alert dialog component that wraps Chakra UI's Dialog components for confirmation dialogs. This component is specifically designed for prompting users before performing destructive actions like deletions, following Chakra UI's Dialog convention.

## Features

- **Simple API**: Clean, straightforward interface for common confirmation scenarios
- **Accessibility**: Proper focus management and ARIA attributes via Chakra UI Dialog
- **Customizable**: Flexible API for different confirmation scenarios
- **Loading States**: Built-in loading state support for async operations
- **TypeScript Support**: Fully typed with comprehensive prop interfaces
- **Chakra UI Convention**: Uses Chakra UI's Dialog components directly

## Usage

### Basic Usage

```tsx
import { PMAlertDialog, PMButton } from '@packmind/ui';

function DeleteItemButton() {
  const handleDelete = () => {
    // Perform delete operation
    console.log('Item deleted!');
  };

  return (
    <PMAlertDialog
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
<PMAlertDialog
  trigger={<PMButton colorScheme="orange">Remove User</PMButton>}
  title="Remove User"
  message="This will permanently remove the user from your organization."
  confirmText="Remove"
  cancelText="Keep User"
  confirmColorScheme="orange"
  onConfirm={handleRemoveUser}
/>
```

### Uncontrolled Mode (Default)

The component works in uncontrolled mode by default - you don't need to manage the open state:

```tsx
function UncontrolledExample() {
  const handleDelete = () => {
    // Perform delete operation
    console.log('Item deleted!');
  };

  return (
    <PMAlertDialog
      trigger={<PMButton colorScheme="red">Delete Item</PMButton>}
      title="Delete Item"
      message="Are you sure you want to delete this item?"
      onConfirm={handleDelete}
    />
  );
}
```

### Controlled Mode

For more control over the dialog state, provide `open` and `onOpenChange` props. In controlled mode, you must handle the dialog state changes yourself:

```tsx
function ControlledExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await deleteItem();
      setIsOpen(false); // Close dialog after successful action
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PMAlertDialog
      trigger={<PMButton colorScheme="red">Delete Item</PMButton>}
      title="Delete Item"
      message="Are you sure you want to delete this item?"
      open={isOpen}
      onOpenChange={setIsOpen}
      isLoading={isLoading}
      onConfirm={handleConfirm}
    />
  );
}
```

## Props

| Prop                 | Type                      | Default    | Description                               |
| -------------------- | ------------------------- | ---------- | ----------------------------------------- |
| `trigger`            | `ReactNode`               | -          | The trigger element that opens the dialog |
| `title`              | `string`                  | -          | Title displayed in the dialog header      |
| `message`            | `string`                  | -          | Message displayed in the dialog body      |
| `confirmText`        | `string`                  | `"Delete"` | Text for the confirm button               |
| `cancelText`         | `string`                  | `"Cancel"` | Text for the cancel button                |
| `confirmColorScheme` | `string`                  | `"red"`    | Color scheme for the confirm button       |
| `onConfirm`          | `() => void`              | -          | Callback called when user confirms        |
| `open`               | `boolean`                 | -          | Whether the dialog is open (controlled)   |
| `onOpenChange`       | `(open: boolean) => void` | -          | Callback for dialog state changes         |
| `isLoading`          | `boolean`                 | `false`    | Whether the confirm action is loading     |

## Advanced Usage

For more complex scenarios, you can use Chakra UI's Dialog components directly:

```tsx
import { Dialog, Portal, PMButton } from '@packmind/ui';

function AdvancedAlertDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <PMButton>Custom Alert Dialog</PMButton>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Custom Title with Icons</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <div>
                <p>Custom content with multiple paragraphs.</p>
                <p>You can add any React elements here.</p>
              </div>
            </Dialog.Body>

            <Dialog.Footer>
              <PMButton variant="outline">Custom Cancel</PMButton>
              <PMButton colorScheme="blue">Custom Confirm</PMButton>
            </Dialog.Footer>

            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
```

## Behavior Notes

### Cancel Button

- **Uncontrolled Mode**: Cancel button automatically closes the dialog
- **Controlled Mode**: Cancel button calls `onOpenChange(false)` - you must handle state updates

### State Management

- **Uncontrolled Mode**: Dialog manages its own open/close state internally
- **Controlled Mode**: You control the dialog state via `open` and `onOpenChange` props

## Accessibility

The component follows accessibility best practices:

- **Focus Management**: Automatically focuses the cancel button when opened (least destructive action)
- **ARIA Attributes**: Proper dialog roles and labeling
- **Keyboard Navigation**: Supports Escape key to close and Tab navigation
- **Screen Reader Support**: Proper semantic structure for assistive technologies

## Design Patterns

This component follows the Packmind slot component pattern as described in the [Wrapping Chakra UI with Slot Components recipe](.packmind/recipes/wrapping-chakra-ui-with-slot-components.md).

## Migration from PMConfirmationModal

This component replaces `PMConfirmationModal` to align with Chakra UI's AlertDialog convention. The API remains the same, only the component name has changed:

```tsx
// Old
import { PMConfirmationModal } from '@packmind/ui';

// New
import { PMAlertDialog } from '@packmind/ui';
```
