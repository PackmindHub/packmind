import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { UserAvatarWithInitials } from './UserAvatarWithInitials';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe('UserAvatarWithInitials', () => {
  describe('when displaying avatar with display name', () => {
    it('displays initials extracted from dotted display name', () => {
      renderWithProvider(<UserAvatarWithInitials displayName="john.doe" />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('displays initials extracted from simple display name', () => {
      renderWithProvider(<UserAvatarWithInitials displayName="jane" />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('displays single initial for single character display name', () => {
      renderWithProvider(<UserAvatarWithInitials displayName="a" />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });
});
