import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import SignInRoute from './_public.sign-in';

vi.mock('../../src/domain/accounts/components/SignInForm', () => ({
  default: () => <div>Sign in form</div>,
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <UIProvider>{component}</UIProvider>
    </MemoryRouter>,
  );
};

describe('SignInRoute', () => {
  it('links to the sign-up page', () => {
    renderWithProviders(<SignInRoute />);

    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute(
      'href',
      '/sign-up/create-account',
    );
  });

  it('renders the sign-up link as a single anchor', () => {
    const { container } = renderWithProviders(<SignInRoute />);

    expect(container.querySelectorAll('a')).toHaveLength(1);
  });

  it('renders no nested anchors', () => {
    const { container } = renderWithProviders(<SignInRoute />);

    expect(container.querySelector('a a')).toBeNull();
  });
});
