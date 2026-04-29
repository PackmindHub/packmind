import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { SpacesPagination } from './SpacesPagination';

const renderWithProvider = (ui: React.ReactElement) =>
  render(<UIProvider>{ui}</UIProvider>);

describe('SpacesPagination', () => {
  it('renders nothing when totalCount <= pageSize', () => {
    renderWithProvider(
      <SpacesPagination
        page={1}
        pageSize={8}
        totalCount={5}
        onPageChange={() => undefined}
      />,
    );
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('disables prev on page 1 and next on last page', () => {
    const { rerender } = renderWithProvider(
      <SpacesPagination
        page={1}
        pageSize={8}
        totalCount={32}
        onPageChange={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();

    rerender(
      <UIProvider>
        <SpacesPagination
          page={4}
          pageSize={8}
          totalCount={32}
          onPageChange={() => undefined}
        />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('calls onPageChange with the requested page', async () => {
    const onPageChange = jest.fn();
    renderWithProvider(
      <SpacesPagination
        page={1}
        pageSize={8}
        totalCount={32}
        onPageChange={onPageChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
