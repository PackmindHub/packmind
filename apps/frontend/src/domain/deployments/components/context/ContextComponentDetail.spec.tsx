import { act, render, screen, within } from '@testing-library/react';
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
import {
  DISTRIBUTION_TAB,
  HISTORY_TAB,
  INSTRUCTIONS_TAB,
} from './buildComponentDetail';
import type { ContextComponent } from './buildPackageContext';
import {
  useListCommandDistributionsQuery,
  useListSkillDistributionsQuery,
  useListStandardDistributionsQuery,
} from '../../api/queries/DeploymentsQueries';
import {
  useGetCommandByIdQuery,
  useGetCommandVersionsQuery,
} from '../../../commands/api/queries/CommandsQueries';
import {
  useGetStandardByIdQuery,
  useGetStandardVersionsQuery,
} from '../../../standards/api/queries/StandardsQueries';
import {
  useGetSkillVersionsQuery,
  useGetSkillWithFilesByIdQuery,
} from '../../../skills/api/queries/SkillsQueries';
import {
  useListChangeProposalsByCommandQuery,
  useListChangeProposalsBySkillQuery,
  useListChangeProposalsByStandardQuery,
} from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useListCommandDistributionsQuery: vi.fn(),
  useListStandardDistributionsQuery: vi.fn(),
  useListSkillDistributionsQuery: vi.fn(),
}));

vi.mock('../../../commands/api/queries/CommandsQueries', () => ({
  useGetCommandByIdQuery: vi.fn(),
  useGetCommandVersionsQuery: vi.fn(),
}));

vi.mock('../../../standards/api/queries/StandardsQueries', () => ({
  useGetStandardByIdQuery: vi.fn(),
  useGetStandardVersionsQuery: vi.fn(),
  useGetRulesByStandardIdQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock('../../../skills/api/queries/SkillsQueries', () => ({
  useGetSkillWithFilesByIdQuery: vi.fn(),
  useGetSkillVersionsQuery: vi.fn(),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  async () => ({
    ...(await vi.importActual(
      '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
    )),
    useListChangeProposalsByCommandQuery: vi.fn(),
    useListChangeProposalsByStandardQuery: vi.fn(),
    useListChangeProposalsBySkillQuery: vi.fn(),
  }),
);

/**
 * Reassigned per case rather than fixed, because the propose affordance is
 * behind a flag evaluated on the signed-in address: both states of it have to
 * be reachable from here.
 */
const auth = vi.hoisted(() => ({
  value: {} as { organization?: { id: string }; user?: { email: string } },
}));

vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => auth.value,
}));

vi.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: 'space-1' }),
}));

/**
 * The organisation's members, which the history reads a version's `userId`
 * against. One name in it, so a row can be seen naming a person and a row can
 * be seen naming nobody.
 */
vi.mock('../../../accounts/api/queries/UserQueries', () => ({
  useGetUsersInMyOrganizationQuery: vi.fn(() => ({
    data: { users: [{ userId: 'user-1', displayName: 'Joan Racenet' }] },
  })),
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

/**
 * The propose drawer is stood in for, for the same reason and for one more.
 * What this file decides is whether the item that opens it is offered at all;
 * the drawer owns its own form and its own mutation.
 *
 * The one more: that mutation is edition-dependent. It is a noop in the OSS
 * stub and a real `useMutation` in the proprietary module the same import
 * resolves to, so rendering it for real makes this file pass in one repo and
 * fail in the other for want of a `QueryClientProvider`.
 */
vi.mock('../../../commands/components/ProposeChangeModal', () => ({
  ProposeChangeModal: () => <div data-testid="propose-name-drawer" />,
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

/*
 * Relative to now rather than a fixed instant, because the header prints the
 * distance and not the date: a literal would read as a different number every
 * day the suite runs.
 */
const THREE_DAYS_AGO = new Date(
  Date.now() - 3 * 24 * 60 * 60 * 1000,
).toISOString();

function pending() {
  return { status: 'pending' };
}

/** The menu the propose item lives in, which is shut until it is asked for. */
async function openActions() {
  await userEvent.click(screen.getByRole('button', { name: /more actions/i }));
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
  (useListChangeProposalsByCommandQuery as Mock).mockReturnValue({
    data: undefined,
  });
  (useListChangeProposalsByStandardQuery as Mock).mockReturnValue({
    data: undefined,
  });
  (useListChangeProposalsBySkillQuery as Mock).mockReturnValue({
    data: undefined,
  });
  const idleQuery = { data: undefined, isLoading: false, isError: false };
  (useGetCommandVersionsQuery as Mock).mockReturnValue(idleQuery);
  (useGetStandardVersionsQuery as Mock).mockReturnValue(idleQuery);
  (useGetSkillVersionsQuery as Mock).mockReturnValue(idleQuery);
  /* Outside the flag's audience, so the propose item is off unless a case asks. */
  auth.value = {
    organization: { id: 'org-1' },
    user: { email: 'reader@example.com' },
  };
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

    it('leaves the list underneath it standing while it waits', async () => {
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

describe('the distribution body', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
  });

  describe('when the component has landed nowhere', () => {
    beforeEach(() => {
      (useListCommandDistributionsQuery as Mock).mockReturnValue({ data: [] });
      (useGetCommandByIdQuery as Mock).mockReturnValue({
        data: { slug: 'run-migrations' },
      });
    });

    it('says what would send it rather than reporting an absence', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.getByText(/Not distributed yet/)).toBeVisible();
    });

    it('still prints the path an agent would read it from', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.getByText('.packmind/recipes/run-migrations.md'),
      ).toBeVisible();
    });

    it("does not mount the list's own empty state underneath it", async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.queryByTestId('command-list')).not.toBeInTheDocument();
    });

    it('leaves the scope line out, there being nothing to scope', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.queryByText(/whichever package sent it/),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the component has landed somewhere', () => {
    beforeEach(() => {
      (useListCommandDistributionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a' }],
      });
    });

    it('says the list is not scoped to the package being read', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.getByText(/whichever package sent it/)).toBeVisible();
    });

    it('mounts the list', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.getByTestId('command-list')).toBeVisible();
    });
  });

  describe('while the landings are still being fetched', () => {
    it('claims neither that there are none nor how they are scoped', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.queryByText(/Not distributed yet/)).not.toBeInTheDocument();
    });

    it('holds the scope line back until the count is known', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.queryByText(/whichever package sent it/),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the component last changed', () => {
    it('says how long ago, off a command', async () => {
      (useGetCommandByIdQuery as Mock).mockReturnValue({
        data: {
          slug: 'run-migrations',
          content: '',
          updatedAt: THREE_DAYS_AGO,
        },
      });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.getByText('updated 3 days ago')).toBeVisible();
    });

    it('says how long ago, off a standard', async () => {
      (useGetStandardByIdQuery as Mock).mockReturnValue({
        data: { standard: { slug: 'naming', updatedAt: THREE_DAYS_AGO } },
      });
      await renderDetail(componentOfType('standard', STANDARD_ID));

      expect(screen.getByText('updated 3 days ago')).toBeVisible();
    });

    /* Off the skill and not off the version the Distribution tab reads. */
    it('says how long ago, off a skill', async () => {
      (useGetSkillWithFilesByIdQuery as Mock).mockReturnValue({
        data: {
          skill: { updatedAt: THREE_DAYS_AGO },
          latestVersion: { slug: 'review-pr' },
          files: [],
        },
      });
      await renderDetail(componentOfType('skill', SKILL_ID));

      expect(screen.getByText('updated 3 days ago')).toBeVisible();
    });
  });

  describe('when the entity sent no date', () => {
    it('says nothing rather than reporting the present moment', async () => {
      (useGetCommandByIdQuery as Mock).mockReturnValue({
        data: { slug: 'run-migrations', content: '' },
      });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.queryByText(/^updated /)).not.toBeInTheDocument();
    });
  });

  describe('when a change is waiting on someone', () => {
    it('says how many, in the header', async () => {
      (useListChangeProposalsByCommandQuery as Mock).mockReturnValue({
        data: { changeProposals: [pending(), pending()] },
      });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.getByRole('link', { name: '2 changes to review' }),
      ).toBeVisible();
    });

    it('sends the reader to the review surface for a command', async () => {
      (useListChangeProposalsByCommandQuery as Mock).mockReturnValue({
        data: { changeProposals: [pending()] },
      });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.getByRole('link', { name: '1 change to review' }),
      ).toHaveAttribute(
        'href',
        `/org/acme/space/core/review-changes/commands/${COMMAND_ID}`,
      );
    });

    it('sends the reader to the review surface for a standard', async () => {
      (useListChangeProposalsByStandardQuery as Mock).mockReturnValue({
        data: { changeProposals: [pending()] },
      });
      await renderDetail(componentOfType('standard', STANDARD_ID));

      expect(
        screen.getByRole('link', { name: '1 change to review' }),
      ).toHaveAttribute(
        'href',
        `/org/acme/space/core/review-changes/standards/${STANDARD_ID}`,
      );
    });

    it('sends the reader to the review surface for a skill', async () => {
      (useListChangeProposalsBySkillQuery as Mock).mockReturnValue({
        data: { changeProposals: [pending()] },
      });
      await renderDetail(componentOfType('skill', SKILL_ID));

      expect(
        screen.getByRole('link', { name: '1 change to review' }),
      ).toHaveAttribute(
        'href',
        `/org/acme/space/core/review-changes/skills/${SKILL_ID}`,
      );
    });
  });

  describe('when every proposal has been decided', () => {
    it('leaves the header quiet', async () => {
      (useListChangeProposalsByCommandQuery as Mock).mockReturnValue({
        data: { changeProposals: [{ status: 'applied' }] },
      });
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.queryByText(/to review/)).not.toBeInTheDocument();
    });
  });

  describe('proposing a change instead of making one', () => {
    it('offers it on a command, to a reader the flag covers', async () => {
      auth.value = {
        organization: { id: 'org-1' },
        user: { email: 'dev@packmind.com' },
      };
      await renderDetail(componentOfType('command', COMMAND_ID));
      await openActions();

      expect(
        screen.getByRole('menuitem', { name: /propose name change/i }),
      ).toBeVisible();
    });

    /* The capability exists for one type, so it is offered on one type. */
    it('does not offer it on a standard, there being nothing behind it', async () => {
      auth.value = {
        organization: { id: 'org-1' },
        user: { email: 'dev@packmind.com' },
      };
      await renderDetail(componentOfType('standard', STANDARD_ID));
      await openActions();

      expect(
        screen.queryByRole('menuitem', { name: /propose name change/i }),
      ).not.toBeInTheDocument();
    });

    it('stays hidden from a reader outside the flag', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));
      await openActions();

      expect(
        screen.queryByRole('menuitem', { name: /propose name change/i }),
      ).not.toBeInTheDocument();
    });
  });
});

const COMMIT = {
  sha: '4f2a9c1d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a39',
  message: 'Packmind: distribute Scratch package\n\nbody nobody needs here',
  author: 'joan.racenet',
  url: 'https://github.com/acme/repo/commit/4f2a9c1',
};

/**
 * The version numbers listed on the tab, in the order they are rendered.
 *
 * Scoped to the panel and not to the screen. The header prints the component's
 * own version in the same shape two lines above, so an unscoped query reads it
 * as the first row of the list and every ordering assertion passes for the
 * wrong reason.
 */
function versionsOnScreen() {
  const panel = screen.getByRole('tabpanel');
  return within(panel)
    .getAllByText(/^v\d+$/)
    .map((node) => node.textContent);
}

describe('the history tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
  });

  it('is offered as a third way of reading a component', async () => {
    await renderDetail(componentOfType('command', COMMAND_ID));

    expect(screen.getByRole('tab', { name: /history/i })).toBeVisible();
  });

  /* No count on the trigger: the number of versions is the v4 in the header. */
  it('wears no count', async () => {
    (useGetCommandVersionsQuery as Mock).mockReturnValue({
      data: [
        { id: 'a', version: 1 },
        { id: 'b', version: 2 },
      ],
      isLoading: false,
      isError: false,
    });
    await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

    expect(screen.getByRole('tab', { name: /history/i })).toHaveTextContent(
      /^History$/,
    );
  });

  describe('the order of the rows', () => {
    it('puts the newest version first, whatever order the API sent', async () => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [
          { id: 'a', version: 1 },
          { id: 'c', version: 3 },
          { id: 'b', version: 2 },
        ],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(versionsOnScreen()).toEqual(['v3', 'v2', 'v1']);
    });
  });

  describe('when there is only one version', () => {
    beforeEach(() => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a', version: 1, createdAt: THREE_DAYS_AGO }],
        isLoading: false,
        isError: false,
      });
    });

    it('says so as a fact rather than showing an empty state', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.getByText(/^One version\./)).toBeVisible();
    });

    it('still lists it', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(versionsOnScreen()).toEqual(['v1']);
    });
  });

  describe('when there are several', () => {
    it('leaves the one-version line out', async () => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [
          { id: 'a', version: 1 },
          { id: 'b', version: 2 },
        ],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.queryByText(/^One version\./)).not.toBeInTheDocument();
    });
  });

  describe('when a version came out of a commit', () => {
    beforeEach(() => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [
          { id: 'a', version: 2, createdAt: THREE_DAYS_AGO, gitCommit: COMMIT },
        ],
        isLoading: false,
        isError: false,
      });
    });

    it('names it by its short sha', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.getByText('4f2a9c1')).toBeVisible();
    });

    it('prints the subject and not the body', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(
        screen.getByText('Packmind: distribute Scratch package'),
      ).toBeVisible();
    });

    it('leaves the body of the message behind', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.queryByText(/body nobody needs/)).not.toBeInTheDocument();
    });

    it('offers a way to the commit itself', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.getByRole('link', { name: /4f2a9c1/ })).toHaveAttribute(
        'href',
        COMMIT.url,
      );
    });

    it('names the author beside the date', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.getByText('joan.racenet')).toBeVisible();
    });
  });

  describe('when a commit carries no link', () => {
    it('prints the sha plain rather than as a link that goes nowhere', async () => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a', version: 2, gitCommit: { ...COMMIT, url: '' } }],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(
        screen.queryByRole('link', { name: /4f2a9c1/ }),
      ).not.toBeInTheDocument();
    });
  });

  /*
   * Every version of every skill, `SkillVersion` having no commit field, so a
   * row with nothing but a number and a date has to be an ordinary row.
   */
  describe('when a version came out of no commit', () => {
    it('lists it with nothing invented about where it came from', async () => {
      (useGetSkillVersionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a', version: 1, createdAt: THREE_DAYS_AGO }],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('skill', SKILL_ID), HISTORY_TAB);

      expect(versionsOnScreen()).toEqual(['v1']);
    });

    it('says nothing about a web app it cannot know about', async () => {
      (useGetSkillVersionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a', version: 1, createdAt: THREE_DAYS_AGO }],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('skill', SKILL_ID), HISTORY_TAB);

      expect(screen.queryByText(/web app/i)).not.toBeInTheDocument();
    });
  });

  describe('while the versions are being fetched', () => {
    it('claims nothing about how many there are', async () => {
      (useGetStandardVersionsQuery as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      await renderDetail(componentOfType('standard', STANDARD_ID), HISTORY_TAB);

      expect(screen.queryByText(/^One version\./)).not.toBeInTheDocument();
    });
  });

  describe('when the versions cannot be read', () => {
    it('says so rather than showing a component with no past', async () => {
      (useGetStandardVersionsQuery as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      await renderDetail(componentOfType('standard', STANDARD_ID), HISTORY_TAB);

      expect(screen.getByText(/Error loading this history/)).toBeVisible();
    });
  });
});

describe('who cut a version', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
  });

  describe('when the version carries a user id', () => {
    it('reads it as the name of an organisation member', async () => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a', version: 1, userId: 'user-1' }],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.getByText('Joan Racenet')).toBeVisible();
    });
  });

  describe('when the version came out of a commit as well', () => {
    it("names the commit's author over the session's", async () => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a', version: 1, userId: 'user-1', gitCommit: COMMIT }],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.queryByText('Joan Racenet')).not.toBeInTheDocument();
    });
  });

  describe('when the id belongs to nobody in the organisation', () => {
    it('names nobody rather than printing the id', async () => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [{ id: 'a', version: 1, userId: 'user-gone' }],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.queryByText(/user-gone/)).not.toBeInTheDocument();
    });
  });
});

describe('what a version changed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
  });

  describe('when the name changed in it', () => {
    it('says what the name was before', async () => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [
          { id: 'b', version: 2, name: 'Run migrations' },
          { id: 'a', version: 1, name: 'Stuff' },
        ],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.getByText('renamed from "Stuff"')).toBeVisible();
    });
  });

  describe('when the name did not change', () => {
    it('says nothing about a rename', async () => {
      (useGetCommandVersionsQuery as Mock).mockReturnValue({
        data: [
          { id: 'b', version: 2, name: 'Same' },
          { id: 'a', version: 1, name: 'Same' },
        ],
        isLoading: false,
        isError: false,
      });
      await renderDetail(componentOfType('command', COMMAND_ID), HISTORY_TAB);

      expect(screen.queryByText(/renamed from/)).not.toBeInTheDocument();
    });
  });
});
