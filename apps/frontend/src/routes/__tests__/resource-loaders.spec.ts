import { queryClient } from '../../shared/data/queryClient';
import { pmToaster } from '@packmind/ui';
import { clientLoader as standardLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.standards.$standardId';
import { clientLoader as packageLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.packages.$packageId';
import { clientLoader as recipeLoader } from '../../../app/routes/org.$orgSlug._protected.space.$spaceSlug._space-protected.commands.$commandId';

jest.mock('../../shared/data/queryClient', () => ({
  queryClient: {
    fetchQuery: jest.fn(),
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

const fetchQueryMock = queryClient.fetchQuery as jest.MockedFunction<
  typeof queryClient.fetchQuery
>;
const pmToasterErrorMock = pmToaster.error as jest.Mock;

describe('organization resource loaders', () => {
  beforeEach(() => {
    fetchQueryMock.mockReset();
    pmToasterErrorMock.mockReset();
  });

  describe('when a standard does not belong to the current space', () => {
    it('redirects to dashboard', async () => {
      fetchQueryMock
        .mockResolvedValueOnce({
          organization: { id: 'org-1', slug: 'org-slug', name: 'Org Name' },
        })
        .mockResolvedValueOnce({ id: 'space-1' })
        .mockResolvedValueOnce({ standards: [] });

      let redirectResponse: Response | null = null;
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

      expect(redirectResponse).toBeTruthy();
      expect(pmToasterErrorMock).not.toHaveBeenCalled();
      expect(fetchQueryMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('when a package does not belong to the current space', () => {
    it('redirects to dashboard', async () => {
      fetchQueryMock
        .mockResolvedValueOnce({
          organization: { id: 'org-1', slug: 'org-slug', name: 'Org Name' },
        })
        .mockResolvedValueOnce({ id: 'space-1' })
        .mockResolvedValueOnce({ packages: [] });

      let redirectResponse: Response | null = null;
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

      expect(redirectResponse).toBeTruthy();
      expect(pmToasterErrorMock).not.toHaveBeenCalled();
      expect(fetchQueryMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('when a recipe does not belong to the current space', () => {
    it('redirects to dashboard', async () => {
      fetchQueryMock
        .mockResolvedValueOnce({
          organization: { id: 'org-1', slug: 'org-slug', name: 'Org Name' },
        })
        .mockResolvedValueOnce({ id: 'space-1' })
        .mockResolvedValueOnce({ recipes: [] });

      let redirectResponse: Response | null = null;
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

      expect(redirectResponse).toBeTruthy();
      expect(pmToasterErrorMock).not.toHaveBeenCalled();
      expect(fetchQueryMock).toHaveBeenCalledTimes(3);
    });
  });
});
