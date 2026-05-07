import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { UserAvatarStack } from './UserAvatarStack';

const users = [
  { id: '1', displayName: 'Alice Smith' },
  { id: '2', displayName: 'Bob Jones' },
  { id: '3', displayName: 'Carol White' },
  { id: '4', displayName: 'Dave Brown' },
  { id: '5', displayName: 'Eve Davis' },
];

const renderComponent = (props: React.ComponentProps<typeof UserAvatarStack>) =>
  render(
    <UIProvider>
      <UserAvatarStack {...props} />
    </UIProvider>,
  );

describe('UserAvatarStack', () => {
  function visibleAvatars(): string[] {
    return screen
      .queryAllByTestId('user-avatar')
      .map((el) => el.getAttribute('aria-label'))
      .filter((label): label is string => Boolean(label));
  }

  describe('when users count is less than maxVisibleAvatars', () => {
    it('shows all user avatars', () => {
      renderComponent({ users: users.slice(0, 2), maxVisibleAvatars: 3 });

      expect(visibleAvatars()).toEqual(['Alice Smith', 'Bob Jones']);
    });

    it('does not show an overflow badge', () => {
      renderComponent({ users: users.slice(0, 2), maxVisibleAvatars: 3 });

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('when users count equals maxVisibleAvatars', () => {
    it('shows all user avatars', () => {
      renderComponent({ users: users.slice(0, 3), maxVisibleAvatars: 3 });

      expect(visibleAvatars()).toEqual([
        'Alice Smith',
        'Bob Jones',
        'Carol White',
      ]);
    });

    it('does not show an overflow badge', () => {
      renderComponent({ users: users.slice(0, 3), maxVisibleAvatars: 3 });

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('when users count exceeds maxVisibleAvatars', () => {
    it('shows maxVisibleAvatars - 1 user avatars', () => {
      renderComponent({ users, maxVisibleAvatars: 3 });

      expect(visibleAvatars()).toEqual(['Alice Smith', 'Bob Jones']);
    });

    it('shows an overflow badge with the count of hidden users', () => {
      // 5 users, maxVisibleAvatars=3 → show 2 avatars + "+3" badge
      renderComponent({ users, maxVisibleAvatars: 3 });

      expect(screen.getByText('+3')).toBeInTheDocument();
    });
  });
});
