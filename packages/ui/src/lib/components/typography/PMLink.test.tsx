import React from 'react';
import { render, screen } from '@testing-library/react';
import { UIProvider } from '../../UIProvider';
import { PMLink } from './PMLink';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
};

describe('PMLink', () => {
  it('renders an anchor with its href', () => {
    renderWithProvider(<PMLink href="/sign-up">Sign up</PMLink>);

    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });

  describe('when asChild is set', () => {
    it('renders the child anchor instead of nesting a second one', () => {
      const { container } = renderWithProvider(
        <PMLink asChild>
          <a href="/sign-up">Sign up</a>
        </PMLink>,
      );

      expect(container.querySelectorAll('a')).toHaveLength(1);
      expect(container.querySelector('a a')).toBeNull();
    });

    it('keeps its own styling on the child anchor', () => {
      const { container } = renderWithProvider(
        <PMLink asChild>
          <a href="/sign-up">Sign up</a>
        </PMLink>,
      );

      expect(container.querySelector('a')).toHaveClass('chakra-link');
    });
  });
});
