import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import {
  createRuleId,
  createStandardId,
  type Standard,
  type StandardId,
} from '@packmind/types';
import { StandardDetails } from './StandardDetails';
import { SpaceNavModeProvider } from '../../organizations/components/SpaceNavModeContext';

vi.mock('../api/queries/StandardsQueries', () => ({
  useGetStandardVersionsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useGetRulesByStandardIdQuery: vi.fn(() => ({
    data: [{ id: createRuleId('rule-1'), content: 'Name events after a verb' }],
    isLoading: false,
    isError: false,
  })),
  useDeleteStandardMutation: vi.fn(() => ({ isPending: false })),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  async () => ({
    ...(await vi.importActual(
      '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
    )),
    useListChangeProposalsByStandardQuery: vi.fn(() => ({ data: undefined })),
  }),
);

vi.mock(
  '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures',
  async () => ({
    ...(await vi.importActual(
      '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures',
    )),
    useStandardEditionFeatures: vi.fn(() => ({ ruleLanguages: {} })),
  }),
);

vi.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ organization: { id: 'org-1', slug: 'acme' } }),
}));

vi.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: 'space-1' }),
}));

const STANDARD_ID: StandardId = createStandardId('standard-1');

const standard = {
  id: STANDARD_ID,
  name: 'Amplitude analytics usage',
  slug: 'amplitude-analytics-usage',
  description: 'What we send to Amplitude, and what we call it.',
  version: 4,
  scope: null,
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
} as unknown as Standard;

/*
 * Both slugs as parameters, because the component reads `spaceSlug` from them
 * and answers as if it were outside a space when it is missing.
 */
const STANDARD_PATH = '/org/:orgSlug/space/:spaceSlug/standards/:standardId';

/**
 * The address is the input, because the mode is resolved from it: `nav` is
 * passed on every case so a mode stored by an earlier one cannot decide a
 * later one, which is exactly how the provider is meant to be pinned.
 */
async function renderAt(address: string) {
  /*
   * Only for the current navigation's header, which reads the space's packages
   * to say how many carry this standard. The plugin-first frame drops that
   * along with the rest of the header, so it asks for nothing.
   */
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[address]}>
            <SpaceNavModeProvider userEmail="reader@example.com">
              <Routes>
                <Route
                  path={STANDARD_PATH}
                  element={
                    <StandardDetails standard={standard} orgSlug="acme" />
                  }
                >
                  <Route path="summary" element={<div>rules table</div>} />
                  <Route path="rule/:ruleId" element={<div>rule detail</div>} />
                </Route>
              </Routes>
            </SpaceNavModeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </UIProvider>,
    );
  });
}

const RULES_ADDRESS =
  '/org/acme/space/core/standards/standard-1/summary?nav=plugin-first';

describe('StandardDetails', () => {
  describe('when the reader is on the plugin-first navigation', () => {
    it('titles the page after what it holds rather than the standard', async () => {
      await renderAt(RULES_ADDRESS);

      expect(screen.getByRole('heading', { name: 'Rules' })).toBeVisible();
    });

    it('leaves the standard to the link back to the pane', async () => {
      await renderAt(RULES_ADDRESS);

      expect(
        screen.getByRole('link', { name: 'Amplitude analytics usage' }),
      ).toHaveAttribute(
        'href',
        '/org/acme/space/core/context?component=standard-1',
      );
    });

    it('returns to the package the reader was reading in', async () => {
      await renderAt(`${RULES_ADDRESS}&package=pkg-9`);

      expect(
        screen.getByRole('link', { name: 'Amplitude analytics usage' }),
      ).toHaveAttribute(
        'href',
        '/org/acme/space/core/context?package=pkg-9&component=standard-1',
      );
    });

    it('offers no second Edit', async () => {
      await renderAt(RULES_ADDRESS);

      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    });

    it('offers no second Delete', async () => {
      await renderAt(RULES_ADDRESS);

      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });

    it('drops the tab strip that sat beside the three in the pane', async () => {
      await renderAt(RULES_ADDRESS);

      expect(screen.queryAllByRole('tab')).toHaveLength(0);
    });

    it('drops the version the pane already prints', async () => {
      await renderAt(RULES_ADDRESS);

      expect(screen.queryByText(/Version:/)).toBeNull();
    });

    it('still renders what the page is for', async () => {
      await renderAt(RULES_ADDRESS);

      expect(screen.getByText('rules table')).toBeVisible();
    });

    describe('when a rule is open', () => {
      const RULE_ADDRESS =
        '/org/acme/space/core/standards/standard-1/rule/rule-1?nav=plugin-first&package=pkg-9';

      it('titles the page after the rule', async () => {
        await renderAt(RULE_ADDRESS);

        expect(
          screen.getByRole('heading', { name: 'Name events after a verb' }),
        ).toBeVisible();
      });

      it('goes back to the standard in the pane, not to the table', async () => {
        await renderAt(RULE_ADDRESS);

        expect(
          screen.getByRole('link', { name: 'Amplitude analytics usage' }),
        ).toHaveAttribute(
          'href',
          '/org/acme/space/core/context?package=pkg-9&component=standard-1',
        );
      });
    });
  });

  describe('when the reader is on the current navigation', () => {
    const TODAY_ADDRESS =
      '/org/acme/space/core/standards/standard-1/summary?nav=today';

    it('keeps the page header it has always had', async () => {
      await renderAt(TODAY_ADDRESS);

      expect(
        screen.getByRole('heading', { name: 'Amplitude analytics usage' }),
      ).toBeVisible();
    });

    it('keeps its own tab strip', async () => {
      await renderAt(TODAY_ADDRESS);

      expect(screen.queryAllByRole('tab')).toHaveLength(2);
    });

    it('keeps Edit', async () => {
      await renderAt(TODAY_ADDRESS);

      expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible();
    });
  });
});
