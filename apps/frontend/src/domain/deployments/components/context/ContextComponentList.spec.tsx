import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import type { Mock } from 'vitest';
import { useGetGroupedChangeProposalsQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import type { ContextComponent } from './buildPackageContext';
import { ContextComponentList } from './ContextComponentList';

vi.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  () => ({
    useGetGroupedChangeProposalsQuery: vi.fn(),
  }),
);

function component(
  key: string,
  overrides: Partial<ContextComponent> = {},
): ContextComponent {
  return {
    key,
    type: 'standard',
    name: `Standard ${key}`,
    summary: '',
    version: 3,
    href: `?component=${key}`,
    createdAt: null,
    ...overrides,
  };
}

async function renderList(
  entries: ContextComponent[],
  grouped: unknown = undefined,
) {
  (useGetGroupedChangeProposalsQuery as Mock).mockReturnValue({
    data: grouped,
  });

  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter>
          <ContextComponentList
            entries={entries.map((entry) => ({ component: entry }))}
          />
        </MemoryRouter>
      </UIProvider>,
    );
  });
}

describe('ContextComponentList', () => {
  describe('when a component is waiting on someone', () => {
    it('marks the row with a readable sentence', async () => {
      await renderList([component('std-1')], {
        standards: [{ artefactId: 'std-1', changeProposalCount: 2 }],
        commands: [],
        skills: [],
        creations: [],
      });

      expect(
        screen.getByRole('img', { name: '2 changes to review' }),
      ).toBeVisible();
    });

    it('shows the count beside it', async () => {
      await renderList([component('std-1')], {
        standards: [{ artefactId: 'std-1', changeProposalCount: 2 }],
        commands: [],
        skills: [],
        creations: [],
      });

      expect(screen.getByText('2')).toBeVisible();
    });

    /*
      The departure from the three dedicated lists, where the count is a link.
      A row has one destination, and it is the component.
    */
    it('leaves the row with a single destination', async () => {
      await renderList([component('std-1')], {
        standards: [{ artefactId: 'std-1', changeProposalCount: 2 }],
        commands: [],
        skills: [],
        creations: [],
      });

      expect(screen.getAllByRole('link')).toHaveLength(1);
    });
  });

  describe('when a component of another type shares its id', () => {
    it('does not mark the row that has nothing waiting', async () => {
      await renderList([component('shared')], {
        standards: [],
        commands: [{ artefactId: 'shared', changeProposalCount: 4 }],
        skills: [],
        creations: [],
      });

      expect(screen.queryByRole('img', { name: /to review/i })).toBeNull();
    });
  });

  describe('when nothing in the list is waiting', () => {
    it('marks no row', async () => {
      await renderList([component('std-1'), component('std-2')], {
        standards: [{ artefactId: 'std-9', changeProposalCount: 1 }],
        commands: [],
        skills: [],
        creations: [],
      });

      expect(screen.queryByRole('img', { name: /to review/i })).toBeNull();
    });
  });

  /* What the OSS edition's stub answers, where proposals do not exist. */
  describe('when the query answers nothing', () => {
    it('marks no row', async () => {
      await renderList([component('std-1')]);

      expect(screen.queryByRole('img', { name: /to review/i })).toBeNull();
    });

    it('still lists the components', async () => {
      await renderList([component('std-1')]);

      expect(screen.getByText('Standard std-1')).toBeVisible();
    });
  });
});
