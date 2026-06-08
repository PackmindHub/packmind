import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { CancelRemovalButton } from './CancelRemovalButton';

const baseProps = {
  pluginSlug: 'my-plugin',
  packageName: 'My Plugin',
  marketplaceName: 'Acme Playbook',
  isCancelling: false,
};

describe('CancelRemovalButton', () => {
  const renderButton = (overrides: Partial<typeof baseProps> = {}) => {
    const onCancel = jest.fn();
    render(
      <UIProvider>
        <CancelRemovalButton
          {...baseProps}
          {...overrides}
          onCancel={onCancel}
        />
      </UIProvider>,
    );
    return { onCancel };
  };

  it('exposes an accessible cancel-removal button', () => {
    renderButton();
    expect(
      screen.getByRole('button', {
        name: 'Cancel removal of My Plugin on Acme Playbook',
      }),
    ).toBeInTheDocument();
  });

  it('invokes onCancel when the user confirms the dialog', async () => {
    const { onCancel } = renderButton();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Cancel removal of My Plugin on Acme Playbook',
        }),
      );
    });

    const confirm = await screen.findByRole('button', {
      name: 'Cancel removal',
    });
    await act(async () => {
      fireEvent.click(confirm);
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables the button while isCancelling is true', () => {
    renderButton({ isCancelling: true });
    const button = screen.getByRole('button', {
      name: 'Cancel removal of My Plugin on Acme Playbook',
    });
    expect(button).toBeDisabled();
  });
});
