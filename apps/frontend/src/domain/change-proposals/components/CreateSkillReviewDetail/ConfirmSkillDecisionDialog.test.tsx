import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { ConfirmSkillDecisionDialog } from './ConfirmSkillDecisionDialog';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<UIProvider>{ui}</UIProvider>);

const baseProps = {
  open: true,
  skillName: 'Generate React component',
  isPending: false,
  onConfirm: jest.fn(),
  onOpenChange: jest.fn(),
};

describe('ConfirmSkillDecisionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when decision is "accept"', () => {
    it('renders the accept title', async () => {
      renderWithProviders(
        <ConfirmSkillDecisionDialog {...baseProps} decision="accept" />,
      );
      expect(
        await screen.findByText('Accept this skill proposal?'),
      ).toBeInTheDocument();
    });

    it('renders the skill name in the body', async () => {
      renderWithProviders(
        <ConfirmSkillDecisionDialog {...baseProps} decision="accept" />,
      );
      expect(
        await screen.findByText(/Generate React component/),
      ).toBeInTheDocument();
    });

    it('renders an "Accept" confirm button', async () => {
      renderWithProviders(
        <ConfirmSkillDecisionDialog {...baseProps} decision="accept" />,
      );
      expect(
        await screen.findByRole('button', { name: 'Accept' }),
      ).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', async () => {
      const onConfirm = jest.fn();
      renderWithProviders(
        <ConfirmSkillDecisionDialog
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
    it('renders the dismiss title', async () => {
      renderWithProviders(
        <ConfirmSkillDecisionDialog {...baseProps} decision="dismiss" />,
      );
      expect(
        await screen.findByText('Dismiss this skill proposal?'),
      ).toBeInTheDocument();
    });

    it('renders a "Dismiss" confirm button', async () => {
      renderWithProviders(
        <ConfirmSkillDecisionDialog {...baseProps} decision="dismiss" />,
      );
      expect(
        await screen.findByRole('button', { name: 'Dismiss' }),
      ).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', async () => {
      const onConfirm = jest.fn();
      renderWithProviders(
        <ConfirmSkillDecisionDialog
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

  describe('when not open', () => {
    it('does not render the dialog content', () => {
      renderWithProviders(
        <ConfirmSkillDecisionDialog
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
