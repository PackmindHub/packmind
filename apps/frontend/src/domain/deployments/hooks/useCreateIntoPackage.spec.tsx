import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import {
  createPackageId,
  createSpaceId,
  createStandardId,
} from '@packmind/types';
import { useCreateIntoPackage, withPackageParam } from './useCreateIntoPackage';

const mutateAsync = vi.fn();
let currentSpaceId: ReturnType<typeof createSpaceId> | undefined =
  createSpaceId('space-1');

vi.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: currentSpaceId }),
}));

vi.mock('../api/queries/DeploymentsQueries', () => ({
  useAddArtefactsToPackagesMutation: () => ({ mutateAsync }),
}));

const STANDARD_ID = createStandardId('standard-1');
const PACKAGE_ID = createPackageId('package-1');

const at = (url: string) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(() => useCreateIntoPackage(), { wrapper }).result;
};

describe('withPackageParam', () => {
  it('carries the package in the address', () => {
    expect(withPackageParam('/standards/create', PACKAGE_ID)).toBe(
      '/standards/create?package=package-1',
    );
  });

  it('leaves the address alone without a package', () => {
    expect(withPackageParam('/standards/create')).toBe('/standards/create');
  });
});

describe('useCreateIntoPackage', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue([{ packageId: PACKAGE_ID, ok: true }]);
    currentSpaceId = createSpaceId('space-1');
  });

  describe('when the address names a package', () => {
    it('reads it', () => {
      expect(at('/standards/create?package=package-1').current.packageId).toBe(
        PACKAGE_ID,
      );
    });

    it('adds the created component to it', async () => {
      await at('/standards/create?package=package-1').current.attachToPackage({
        standardIds: [STANDARD_ID],
      });

      expect(mutateAsync).toHaveBeenCalledWith({
        spaceId: createSpaceId('space-1'),
        entries: [{ packageId: PACKAGE_ID, standardIds: [STANDARD_ID] }],
      });
    });

    it('reports the component attached', async () => {
      const outcome = await at(
        '/standards/create?package=package-1',
      ).current.attachToPackage({ standardIds: [STANDARD_ID] });

      expect(outcome).toBe('attached');
    });
  });

  describe('when the address names no package', () => {
    it('reads none', () => {
      expect(at('/standards/create').current.packageId).toBeNull();
    });

    it('leaves the component where it is', async () => {
      await at('/standards/create').current.attachToPackage({
        standardIds: [STANDARD_ID],
      });

      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('reports that nothing was asked for', async () => {
      const outcome = await at('/standards/create').current.attachToPackage({
        standardIds: [STANDARD_ID],
      });

      expect(outcome).toBe('not-asked');
    });
  });

  describe('when the space is not resolved yet', () => {
    beforeEach(() => {
      currentSpaceId = undefined;
    });

    it('asks for nothing', async () => {
      await at('/standards/create?package=package-1').current.attachToPackage({
        standardIds: [STANDARD_ID],
      });

      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('when the package refuses the component', () => {
    beforeEach(() => {
      mutateAsync.mockResolvedValue([
        { packageId: PACKAGE_ID, ok: false, error: new Error('nope') },
      ]);
    });

    it('reports the failure', async () => {
      const outcome = await at(
        '/standards/create?package=package-1',
      ).current.attachToPackage({ standardIds: [STANDARD_ID] });

      expect(outcome).toBe('failed');
    });
  });

  describe('when the call itself throws', () => {
    beforeEach(() => {
      mutateAsync.mockRejectedValue(new Error('offline'));
    });

    it('reports the failure rather than propagating it', async () => {
      const outcome = await at(
        '/standards/create?package=package-1',
      ).current.attachToPackage({ standardIds: [STANDARD_ID] });

      expect(outcome).toBe('failed');
    });
  });
});
