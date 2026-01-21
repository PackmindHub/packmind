import { queryClient } from '../../shared/data/queryClient';
import { pmToaster } from '@packmind/ui';
import { clientLoader as standardLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.standards.$standardId';
import { clientLoader as packageLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.packages.$packageId';
import { clientLoader as recipeLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.commands.$commandId';

jest.mock('../../shared/data/queryClient', () => ({
  queryClient: {
    ensureQueryData: jest.fn(),
  },
}));

jest.mock('@packmind/ui', () => {
  const actual = jest.requireActual('@packmind/ui');
  const mockToaster = {
    create: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  };
  return {
    ...actual,
    pmToaster: mockToaster,
  };
});

const ensureQueryDataMock = queryClient.ensureQueryData as jest.MockedFunction<
  typeof queryClient.ensureQueryData
>;
const pmToasterErrorMock = pmToaster.error as jest.Mock;

describe('organization resource loaders', () => {
  beforeEach(() => {
    ensureQueryDataMock.mockReset();
    pmToasterErrorMock.mockReset();
  });

  describe('when a standard does not belong to the current space', () => {
    let redirectResponse: Response | null = null;

    beforeEach(async () => {
      ensureQueryDataMock
        .mockResolvedValueOnce({
          organization: { id: 'org-1', slug: 'org-slug', name: 'Org Name' },
        })
        .mockResolvedValueOnce({ id: 'space-1' })
        .mockResolvedValueOnce({ standards: [] });

      try {
        await standardLoader({
          params: {
            standardId: 'std-1',
            spaceSlug: 'space-slug',
          },
        });
      } catch (response) {
        redirectResponse = response as Response;
      }
    });

    it('redirects to dashboard', () => {
      expect(redirectResponse).toBeTruthy();
    });

    it('does not display an error toast', () => {
      expect(pmToasterErrorMock).not.toHaveBeenCalled();
    });

    it('calls ensureQueryData twice', () => {
      expect(ensureQueryDataMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('when a package does not belong to the current space', () => {
    let redirectResponse: Response | null = null;

    beforeEach(async () => {
      ensureQueryDataMock
        .mockResolvedValueOnce({
          organization: { id: 'org-1', slug: 'org-slug', name: 'Org Name' },
        })
        .mockResolvedValueOnce({ id: 'space-1' })
        .mockResolvedValueOnce({ packages: [] });

      try {
        await packageLoader({
          params: {
            orgSlug: 'org-slug',
            spaceSlug: 'space-slug',
            packageId: 'pkg-1',
          },
        });
      } catch (response) {
        redirectResponse = response as Response;
      }
    });

    it('redirects to dashboard', () => {
      expect(redirectResponse).toBeTruthy();
    });

    it('does not display an error toast', () => {
      expect(pmToasterErrorMock).not.toHaveBeenCalled();
    });

    it('calls ensureQueryData three times', () => {
      expect(ensureQueryDataMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('when a recipe does not belong to the current space', () => {
    let redirectResponse: Response | null = null;

    beforeEach(async () => {
      ensureQueryDataMock
        .mockResolvedValueOnce({
          organization: { id: 'org-1', slug: 'org-slug', name: 'Org Name' },
        })
        .mockResolvedValueOnce({ id: 'space-1' })
        .mockResolvedValueOnce({ recipes: [] });

      try {
        await recipeLoader({
          params: {
            orgSlug: 'org-slug',
            spaceSlug: 'space-slug',
            commandId: 'rec-1',
          },
        });
      } catch (response) {
        redirectResponse = response as Response;
      }
    });

    it('redirects to dashboard', () => {
      expect(redirectResponse).toBeTruthy();
    });

    it('does not display an error toast', () => {
      expect(pmToasterErrorMock).not.toHaveBeenCalled();
    });

    it('calls ensureQueryData three times', () => {
      expect(ensureQueryDataMock).toHaveBeenCalledTimes(3);
    });
  });
});
