import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { ConfirmCreationDecisionDialog } from './ConfirmCreationDecisionDialog';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<UIProvider>{ui}</UIProvider>);

const baseProps = {
  open: true,
  artefactLabel: 'skill' as const,
  artefactName: 'Generate React component',
  isPending: false,
  onConfirm: jest.fn(),
  onOpenChange: jest.fn(),
};

describe('ConfirmCreationDecisionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when decision is "accept"', () => {
    it('renders the accept title with the artefact label', async () => {
      renderWithProviders(
        <ConfirmCreationDecisionDialog {...baseProps} decision="accept" />,
      );
      expect(
        await screen.findByText('Accept this skill proposal?'),
      ).toBeInTheDocument();
    });

    it('renders the artefact name in the body', async () => {
      renderWithProviders(
        <ConfirmCreationDecisionDialog {...baseProps} decision="accept" />,
      );
      expect(
        await screen.findByText(/Generate React component/),
      ).toBeInTheDocument();
    });

    it('renders an "Accept" confirm button', async () => {
      renderWithProviders(
        <ConfirmCreationDecisionDialog {...baseProps} decision="accept" />,
      );
      expect(
        await screen.findByRole('button', { name: 'Accept' }),
      ).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', async () => {
      const onConfirm = jest.fn();
      renderWithProviders(
        <ConfirmCreationDecisionDialog
          {...baseProps}
          decision="accept"
          onConfirm={onConfirm}
        />,
      );
      const button = await screen.findByRole('button', { name: 'Accept' });
      fireEvent.click(button);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('when decision is "dismiss"', () => {
    it('renders the dismiss title with the artefact label', async () => {
      renderWithProviders(
        <ConfirmCreationDecisionDialog {...baseProps} decision="dismiss" />,
      );
      expect(
        await screen.findByText('Dismiss this skill proposal?'),
      ).toBeInTheDocument();
    });

    it('renders a "Dismiss" confirm button', async () => {
      renderWithProviders(
        <ConfirmCreationDecisionDialog {...baseProps} decision="dismiss" />,
      );
      expect(
        await screen.findByRole('button', { name: 'Dismiss' }),
      ).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', async () => {
      const onConfirm = jest.fn();
      renderWithProviders(
        <ConfirmCreationDecisionDialog
          {...baseProps}
          decision="dismiss"
          onConfirm={onConfirm}
        />,
      );
      const button = await screen.findByRole('button', { name: 'Dismiss' });
      fireEvent.click(button);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('artefact label substitution', () => {
    it('renders "command" in the accept title when label is "command"', async () => {
      renderWithProviders(
        <ConfirmCreationDecisionDialog
          {...baseProps}
          decision="accept"
          artefactLabel="command"
        />,
      );
      expect(
        await screen.findByText('Accept this command proposal?'),
      ).toBeInTheDocument();
    });

    it('renders "standard" in the dismiss title when label is "standard"', async () => {
      renderWithProviders(
        <ConfirmCreationDecisionDialog
          {...baseProps}
          decision="dismiss"
          artefactLabel="standard"
        />,
      );
      expect(
        await screen.findByText('Dismiss this standard proposal?'),
      ).toBeInTheDocument();
    });
  });

  describe('when isPending is true', () => {
    it('does not call onConfirm when the confirm button is clicked', async () => {
      const onConfirm = jest.fn();
      renderWithProviders(
        <ConfirmCreationDecisionDialog
          {...baseProps}
          decision="accept"
          isPending={true}
          onConfirm={onConfirm}
        />,
      );
      const buttons = await screen.findAllByRole('button');
      const confirmButton = buttons[buttons.length - 2];
      fireEvent.click(confirmButton);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('when not open', () => {
    it('does not render the dialog content', () => {
      renderWithProviders(
        <ConfirmCreationDecisionDialog
          {...baseProps}
          open={false}
          decision="accept"
        />,
      );
      expect(
        screen.queryByText('Accept this skill proposal?'),
      ).not.toBeInTheDocument();
    });
  });
});
