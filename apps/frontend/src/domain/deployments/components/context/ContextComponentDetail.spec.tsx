import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  createCommandId,
  createSkillId,
  createStandardId,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { ContextComponentDetail } from './ContextComponentDetail';
import { DISTRIBUTION_TAB, INSTRUCTIONS_TAB } from './buildComponentDetail';
import type { ContextComponent } from './buildPackageContext';
import {
  useListCommandDistributionsQuery,
  useListSkillDistributionsQuery,
  useListStandardDistributionsQuery,
} from '../../api/queries/DeploymentsQueries';
import { useGetCommandByIdQuery } from '../../../commands/api/queries/CommandsQueries';
import { useGetStandardByIdQuery } from '../../../standards/api/queries/StandardsQueries';
import { useGetSkillWithFilesByIdQuery } from '../../../skills/api/queries/SkillsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useListCommandDistributionsQuery: vi.fn(),
  useListStandardDistributionsQuery: vi.fn(),
  useListSkillDistributionsQuery: vi.fn(),
}));

vi.mock('../../../commands/api/queries/CommandsQueries', () => ({
  useGetCommandByIdQuery: vi.fn(),
}));

vi.mock('../../../standards/api/queries/StandardsQueries', () => ({
  useGetStandardByIdQuery: vi.fn(),
  useGetRulesByStandardIdQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock('../../../skills/api/queries/SkillsQueries', () => ({
  useGetSkillWithFilesByIdQuery: vi.fn(),
}));

vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ organization: { id: 'org-1' } }),
}));

vi.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: 'space-1' }),
}));

/**
 * The three lists are stood in for rather than rendered. They own their own
 * query, their own table and their own empty state, and what this file decides
 * is what sits above them: which path is printed, and whether the tab wears a
 * count. Rendering the real table here would test `DeploymentsHistory` instead.
 */
vi.mock('../CommandDistributionsList/CommandDistributionsList', () => ({
  CommandDistributionsList: () => <div data-testid="command-list" />,
}));
vi.mock('../StandardDistributionsList/StandardDistributionsList', () => ({
  StandardDistributionsList: () => <div data-testid="standard-list" />,
}));
vi.mock('../SkillDistributionsList/SkillDistributionsList', () => ({
  SkillDistributionsList: () => <div data-testid="skill-list" />,
}));

const COMMAND_ID = createCommandId('command-1');
const STANDARD_ID = createStandardId('standard-1');
const SKILL_ID = createSkillId('skill-1');

function componentOfType(
  type: ContextComponent['type'],
  key: string,
): ContextComponent {
  return {
    key,
    type,
    name: 'Amplitude analytics usage',
    summary: '',
    version: 4,
    href: '/somewhere',
    createdAt: null,
  };
}

/**
 * Awaited, and the render wrapped, because the tab strip measures its own
 * active indicator after mount. That is a state update arriving a microtask
 * late, and an unawaited render reports it as an act warning on every case in
 * this file.
 */
async function renderDetail(
  component: ContextComponent,
  tab: string = DISTRIBUTION_TAB,
  onTabChange: (value: string) => void = vi.fn(),
) {
  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter>
          <ContextComponentDetail
            component={component}
            packageName="Backend conventions"
            backHref="?package=pkg-1"
            editHref="/edit"
            tab={tab}
            onTabChange={onTabChange}
            orgSlug="acme"
            spaceSlug="core"
            onMove={vi.fn()}
            onRemove={vi.fn()}
            onDelete={vi.fn()}
          />
        </MemoryRouter>
      </UIProvider>,
    );
  });
}

/** No distributions and no entity, which is every query's starting point. */
function resetToEmpty() {
  (useListCommandDistributionsQuery as Mock).mockReturnValue({
    data: undefined,
  });
  (useListStandardDistributionsQuery as Mock).mockReturnValue({
    data: undefined,
  });
  (useListSkillDistributionsQuery as Mock).mockReturnValue({ data: undefined });
  (useGetCommandByIdQuery as Mock).mockReturnValue({ data: undefined });
  (useGetStandardByIdQuery as Mock).mockReturnValue({ data: undefined });
  (useGetSkillWithFilesByIdQuery as Mock).mockReturnValue({ data: undefined });
}

describe('ContextComponentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
  });

  it('offers the instructions as one way of reading it', async () => {
    await renderDetail(componentOfType('command', COMMAND_ID));

    expect(screen.getByRole('tab', { name: /instructions/i })).toBeVisible();
  });

  it('offers where it went as the other', async () => {
    await renderDetail(componentOfType('command', COMMAND_ID));

    expect(screen.getByRole('tab', { name: /distribution/i })).toBeVisible();
  });

  it('names the package it was opened from, rather than saying back', async () => {
    await renderDetail(componentOfType('command', COMMAND_ID));

    expect(
      screen.getByRole('link', { name: 'Backend conventions' }),
    ).toBeVisible();
  });

  describe('when a tab is picked', () => {
    it('hands the choice to the surface that owns the address', async () => {
      const onTabChange = vi.fn();
      await renderDetail(
        componentOfType('command', COMMAND_ID),
        DISTRIBUTION_TAB,
        onTabChange,
      );

      await userEvent.click(screen.getByRole('tab', { name: /instructions/i }));

      expect(onTabChange).toHaveBeenCalledWith(INSTRUCTIONS_TAB);
    });
  });

  describe('the count on the distribution tab', () => {
    it('stays off while the component has landed nowhere', async () => {
      (useListCommandDistributionsQuery as Mock).mockReturnValue({ data: [] });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.getByRole('tab', { name: /distribution/i }),
      ).toHaveTextContent(/^Distribution$/);
    });

    it('reports how many places it reached', async () => {
      (useListCommandDistributionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a' }, { id: 'b' }],
      });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.getByRole('tab', { name: /distribution/i }),
      ).toHaveTextContent('2');
    });
  });

  describe('the path an agent reads', () => {
    it('stays absent until the entity carrying the slug has arrived', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.queryByText(/^\.packmind\//)).not.toBeInTheDocument();
    });

    it('leaves the list underneath it standing meanwhile', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.getByTestId('command-list')).toBeVisible();
    });

    it('reads a command out of the recipes folder', async () => {
      (useGetCommandByIdQuery as Mock).mockReturnValue({
        data: { slug: 'run-migrations' },
      });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.getByText('.packmind/recipes/run-migrations.md'),
      ).toBeVisible();
    });

    it('reads a standard out of the standards folder', async () => {
      (useGetStandardByIdQuery as Mock).mockReturnValue({
        data: { standard: { slug: 'amplitude-analytics-usage' } },
      });
      await renderDetail(componentOfType('standard', STANDARD_ID));

      expect(
        screen.getByText('.packmind/standards/amplitude-analytics-usage.md'),
      ).toBeVisible();
    });

    it('reads a skill as the folder it is', async () => {
      (useGetSkillWithFilesByIdQuery as Mock).mockReturnValue({
        data: { latestVersion: { slug: 'release-proprietary' }, files: [] },
      });
      await renderDetail(componentOfType('skill', SKILL_ID));

      expect(
        screen.getByText('.packmind/skills/release-proprietary/'),
      ).toBeVisible();
    });

    it('says the path is the Packmind one and not the only one', async () => {
      (useGetCommandByIdQuery as Mock).mockReturnValue({
        data: { slug: 'run-migrations' },
      });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.getByText(/The Packmind path/)).toBeVisible();
    });
  });
});

describe('the landings listed under the path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
  });

  it("mounts a command's own list", async () => {
    await renderDetail(componentOfType('command', COMMAND_ID));

    expect(screen.getByTestId('command-list')).toBeVisible();
  });

  it("mounts a standard's own list", async () => {
    await renderDetail(componentOfType('standard', STANDARD_ID));

    expect(screen.getByTestId('standard-list')).toBeVisible();
  });

  it("mounts a skill's own list", async () => {
    await renderDetail(componentOfType('skill', SKILL_ID));

    expect(screen.getByTestId('skill-list')).toBeVisible();
  });
});
