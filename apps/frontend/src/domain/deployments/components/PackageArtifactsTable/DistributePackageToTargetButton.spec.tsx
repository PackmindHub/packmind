import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { createPackageId, createTargetId } from '@packmind/types';
import { DistributePackageToTargetButton } from './DistributePackageToTargetButton';
import { PACKAGE_MESSAGES } from '../../constants/messages';

const mockDeployPackage = jest.fn();
jest.mock('../../hooks/useDeployPackage', () => ({
  useDeployPackage: () => ({
    deployPackage: mockDeployPackage,
    isDeploying: false,
  }),
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const PMTooltip = ({
    label,
    children,
  }: {
    label: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="pm-tooltip" data-label={String(label)}>
      {children}
    </div>
  );
  return { ...actual, PMTooltip };
});

const renderWithProvider = (ui: React.ReactElement) =>
  render(<UIProvider>{ui}</UIProvider>);

const TEST_PACKAGE_ID = createPackageId('pkg-1');
const TEST_TARGET_ID = createTargetId('target-1');

describe('DistributePackageToTargetButton', () => {
  beforeEach(() => {
    mockDeployPackage.mockReset();
  });

  it('renders an enabled button without a tooltip when the target can distribute from the app', () => {
    renderWithProvider(
      <DistributePackageToTargetButton
        packageId={TEST_PACKAGE_ID}
        packageName="my-pkg"
        targetId={TEST_TARGET_ID}
        canDistributeFromApp={true}
        isDistributeReadinessLoading={false}
        hasOutdatedArtifacts={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Distribute' })).toBeEnabled();
    expect(screen.queryByTestId('pm-tooltip')).not.toBeInTheDocument();
  });

  it('renders a disabled button wrapped in the not-configured tooltip when the target cannot distribute from the app', () => {
    renderWithProvider(
      <DistributePackageToTargetButton
        packageId={TEST_PACKAGE_ID}
        packageName="my-pkg"
        targetId={TEST_TARGET_ID}
        canDistributeFromApp={false}
        isDistributeReadinessLoading={false}
        hasOutdatedArtifacts={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Distribute' })).toBeDisabled();
    const tooltip = screen.getByTestId('pm-tooltip');
    expect(tooltip).toHaveAttribute(
      'data-label',
      PACKAGE_MESSAGES.distribution.notConfigured,
    );
  });

  it('renders a disabled button without the not-configured tooltip while readiness is loading', () => {
    renderWithProvider(
      <DistributePackageToTargetButton
        packageId={TEST_PACKAGE_ID}
        packageName="my-pkg"
        targetId={TEST_TARGET_ID}
        canDistributeFromApp={false}
        isDistributeReadinessLoading={true}
        hasOutdatedArtifacts={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Distribute' })).toBeDisabled();
    expect(screen.queryByTestId('pm-tooltip')).not.toBeInTheDocument();
  });
});
