import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { UserAvatarWithInitials } from './UserAvatarWithInitials';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe('UserAvatarWithInitials', () => {
  describe('when displaying avatar with email', () => {
    it('displays initials extracted from dotted email', () => {
      renderWithProvider(
        <UserAvatarWithInitials email="john.doe@example.com" />,
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('displays initials extracted from simple email', () => {
      renderWithProvider(<UserAvatarWithInitials email="jane@example.com" />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('displays single initial for single character email', () => {
      renderWithProvider(<UserAvatarWithInitials email="a@example.com" />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });
});
