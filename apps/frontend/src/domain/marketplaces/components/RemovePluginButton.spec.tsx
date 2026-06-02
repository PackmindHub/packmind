import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { RemovePluginButton } from './RemovePluginButton';

const baseProps = {
  pluginSlug: 'my-plugin',
  marketplaceName: 'Acme Playbook',
  packageName: 'My Plugin',
  isMarking: false,
};

describe('RemovePluginButton', () => {
  const renderButton = (overrides: Partial<typeof baseProps> = {}) => {
    const onMark = jest.fn();
    render(
      <UIProvider>
        <RemovePluginButton {...baseProps} {...overrides} onMark={onMark} />
      </UIProvider>,
    );
    return { onMark };
  };

  it('exposes an accessible remove button labelled with the package and marketplace', () => {
    renderButton();
    expect(
      screen.getByRole('button', {
        name: 'Remove My Plugin from Acme Playbook',
      }),
    ).toBeInTheDocument();
  });

  it('opens the confirmation modal on click and references the CLI follow-up', async () => {
    renderButton();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Remove My Plugin from Acme Playbook',
        }),
      );
    });

    expect(
      await screen.findByText(/packmind-cli plugins delete my-plugin/),
    ).toBeInTheDocument();
  });

  it('invokes onMark when the user confirms the modal', async () => {
    const { onMark } = renderButton();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Remove My Plugin from Acme Playbook',
        }),
      );
    });

    const confirmButton = await screen.findByRole('button', {
      name: 'Mark for removal',
    });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(onMark).toHaveBeenCalledTimes(1);
  });

  it('shows the button in a loading state while isMarking is true', () => {
    renderButton({ isMarking: true });
    const button = screen.getByRole('button', {
      name: 'Remove My Plugin from Acme Playbook',
    });
    expect(button).toBeDisabled();
  });
});
