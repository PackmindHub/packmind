import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SubmitErrorBanner } from './SubmitErrorBanner';

describe('SubmitErrorBanner', () => {
  const renderBanner = (message: string) =>
    render(
      <UIProvider>
        <SubmitErrorBanner message={message} />
      </UIProvider>,
    );

  it('renders the banner with a fixed title', () => {
    renderBanner('Something went wrong');

    expect(screen.getByTestId('submit-error-banner')).toBeInTheDocument();
    expect(screen.getByText('Unable to link marketplace')).toBeInTheDocument();
  });

  it('displays the provided message verbatim', () => {
    const message =
      'Repository acme/foo is already linked as a standard Git repository in this organization';

    renderBanner(message);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('has the alert role for assistive technology', () => {
    renderBanner('Boom');

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
