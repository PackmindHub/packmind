import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
            sections={[
              {
                key: 'standard',
                label: 'Standards',
                count: entries.length,
                entries: entries.map((entry) => ({ component: entry })),
              },
            ]}
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

  describe('when the list has several bands', () => {
    async function renderBands() {
      (useGetGroupedChangeProposalsQuery as Mock).mockReturnValue({
        data: undefined,
      });

      await act(async () => {
        render(
          <UIProvider>
            <MemoryRouter>
              <ContextComponentList
                sections={[
                  {
                    key: 'standard',
                    label: 'Standards',
                    count: '2 of 40',
                    entries: [
                      { component: component('std-1') },
                      { component: component('std-2') },
                    ],
                  },
                  {
                    key: 'skill',
                    label: 'Skills',
                    count: 1,
                    entries: [
                      {
                        component: component('skill-1', {
                          type: 'skill',
                          name: 'Release checklist',
                        }),
                      },
                    ],
                  },
                ]}
              />
            </MemoryRouter>
          </UIProvider>,
        );
      });
    }

    it('heads each band with what it holds', async () => {
      await renderBands();

      expect(screen.getByText('Standards')).toBeVisible();
      expect(screen.getByText('Skills')).toBeVisible();
    });

    it('prints the count the caller phrased, filtered or not', async () => {
      await renderBands();

      expect(screen.getByText('2 of 40')).toBeVisible();
      expect(screen.getByText('1')).toBeVisible();
    });

    it('lists the rows of every band', async () => {
      await renderBands();

      expect(screen.getByText('Standard std-1')).toBeVisible();
      expect(screen.getByText('Release checklist')).toBeVisible();
    });

    describe('when the band can be picked whole', () => {
      async function renderPickable(
        selectedKeys: ReadonlySet<string>,
        onSelectMany = vi.fn(),
      ) {
        (useGetGroupedChangeProposalsQuery as Mock).mockReturnValue({
          data: undefined,
        });

        await act(async () => {
          render(
            <UIProvider>
              <MemoryRouter>
                <ContextComponentList
                  sections={[
                    {
                      key: 'standard',
                      label: 'Standards',
                      count: 2,
                      entries: [
                        { component: component('std-1') },
                        { component: component('std-2') },
                      ],
                    },
                  ]}
                  selectedKeys={selectedKeys}
                  onToggleSelect={vi.fn()}
                  onSelectMany={onSelectMany}
                />
              </MemoryRouter>
            </UIProvider>,
          );
        });

        return onSelectMany;
      }

      it('takes the whole band in one call', async () => {
        const onSelectMany = await renderPickable(new Set());

        await userEvent.click(
          screen.getByRole('checkbox', { name: 'Select all standards' }),
        );

        expect(onSelectMany).toHaveBeenCalledTimes(1);
        expect(onSelectMany.mock.calls[0][0]).toHaveLength(2);
        expect(onSelectMany.mock.calls[0][1]).toBe(true);
      });

      describe('when the band is already picked whole', () => {
        it('offers to drop it rather than to pick it again', async () => {
          const onSelectMany = await renderPickable(
            new Set(['standard:std-1', 'standard:std-2']),
          );

          await userEvent.click(
            screen.getByRole('checkbox', { name: 'Clear all standards' }),
          );

          expect(onSelectMany.mock.calls[0][1]).toBe(false);
        });
      });

      describe('when part of the band is picked', () => {
        it('still offers to take the rest', async () => {
          const onSelectMany = await renderPickable(
            new Set(['standard:std-1']),
          );

          await userEvent.click(
            screen.getByRole('checkbox', { name: 'Select all standards' }),
          );

          expect(onSelectMany.mock.calls[0][1]).toBe(true);
        });
      });
    });

    describe('when a band is folded', () => {
      it('takes its rows off the list', async () => {
        await renderBands();

        await userEvent.click(
          screen.getByRole('button', { name: 'Collapse Standards' }),
        );

        expect(screen.queryByText('Standard std-1')).toBeNull();
        expect(screen.getByText('Release checklist')).toBeVisible();
      });

      it('keeps saying how many it holds', async () => {
        await renderBands();

        await userEvent.click(
          screen.getByRole('button', { name: 'Collapse Standards' }),
        );

        expect(screen.getByText('2 of 40')).toBeVisible();
      });

      it('says it is shut on the control that shut it, and nowhere else', async () => {
        await renderBands();

        await userEvent.click(
          screen.getByRole('button', { name: 'Collapse Standards' }),
        );

        expect(
          screen.getByRole('button', { name: 'Expand Standards' }),
        ).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('collapsed')).toBeNull();
      });

      it('gives them back when it is opened again', async () => {
        await renderBands();

        await userEvent.click(
          screen.getByRole('button', { name: 'Collapse Standards' }),
        );
        await userEvent.click(
          screen.getByRole('button', { name: 'Expand Standards' }),
        );

        expect(screen.getByText('Standard std-1')).toBeVisible();
      });
    });
  });

  describe('when a component has a summary', () => {
    it('reads it on the row, which is one line now', async () => {
      await renderList([component('std-1', { summary: 'How we name things' })]);

      expect(screen.getByText('How we name things')).toBeVisible();
    });
  });
});
