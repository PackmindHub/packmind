import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  DetectionSeverity,
  ProgrammingLanguage,
  RuleLanguageDetectionStatus,
  createCommandId,
  createRuleId,
  createSkillId,
  createStandardId,
} from '@packmind/types';
import type {
  ActiveDetectionProgramId,
  PackageId,
  RuleDetectionStatusSummary,
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
  useGetRulesByStandardIdQuery,
  useGetStandardByIdQuery,
  useGetStandardVersionsQuery,
} from '../../../standards/api/queries/StandardsQueries';
import { useGetStandardRulesDetectionStatusQuery } from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';
import { useUpdateActiveDetectionProgramSeverityMutation } from '@packmind/proprietary/frontend/domain/detection/api/queries/DetectionProgramQueries';
import {
  useGetSkillVersionsQuery,
  useGetSkillWithFilesByIdQuery,
} from '../../../skills/api/queries/SkillsQueries';
import { useCanEditSkillFiles } from '../../../skills/hooks/useCanEditSkillFiles';
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
 * The detection statuses, which decide whether a rule row says anything about
 * being detected automatically, and whether it opens.
 *
 * Mocked at the alias rather than at either edition's module, so both
 * repositories run the same cases: the OSS stub answers with an empty array
 * forever, which would leave every case here asserting the absence of
 * everything.
 */
/**
 * Setting a severity, which only the proprietary edition can do. A factory with
 * no `importActual`, because in the other repository this specifier resolves to
 * a stub whose whole content is this one export.
 */
vi.mock(
  '@packmind/proprietary/frontend/domain/detection/api/queries/DetectionProgramQueries',
  () => ({
    useUpdateActiveDetectionProgramSeverityMutation: vi.fn(),
  }),
);

vi.mock(
  '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures',
  async () => ({
    ...(await vi.importActual(
      '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures',
    )),
    useGetStandardRulesDetectionStatusQuery: vi.fn(),
  }),
);

/**
 * A language spells as itself here. The real function is edition-dependent, and
 * a case asserting on "TypeScript" would read "Active in TypeScript" in one
 * repository and "Active in " in the other.
 */
vi.mock(
  '@packmind/proprietary/frontend/domain/detection/components/DetectionCardUtils',
  async () => ({
    ...(await vi.importActual(
      '@packmind/proprietary/frontend/domain/detection/components/DetectionCardUtils',
    )),
    getLanguageDisplayName: (language?: string | null) => language ?? '',
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

/* The other one, for both of the same reasons. */
vi.mock('../../../commands/components/ProposeDescriptionChangeModal', () => ({
  ProposeDescriptionChangeModal: () => (
    <div data-testid="propose-instructions-drawer" />
  ),
}));

/**
 * The download popover is stood in for too. What this file decides is whether
 * it is offered and on which type; the popover owns its agent list and its
 * download call, and it reads analytics through the edition alias, which is a
 * provider in one repository and a noop in the other.
 */
vi.mock('../../../skills/components/DownloadSkillPopover', () => ({
  DownloadSkillPopover: () => <div data-testid="download-skill" />,
}));

vi.mock('../../../skills/hooks/useCanEditSkillFiles', () => ({
  useCanEditSkillFiles: vi.fn(),
}));

/*
  The real editor mounts CodeMirror, which jsdom has no layout for. What these
  cases are about is whether the pane offers the edit at all, so a marker is
  enough to say the prose gave way to it.
*/
vi.mock('../../../skills/components/SkillFileEditor', () => ({
  SkillFileEditor: ({ filePath }: { filePath: string }) => (
    <div data-testid="skill-file-editor">{filePath}</div>
  ),
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
  /**
   * What the two panes disagree on. Defaults to being read inside a package,
   * which is what every case here was written against; the space-wide pane
   * passes the other three.
   */
  scope: Readonly<{
    backLabel?: string;
    moveLabel?: string;
    onRemove?: (() => void) | null;
    packageId?: PackageId | null;
  }> = {},
) {
  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter>
          <ContextComponentDetail
            component={component}
            backLabel={scope.backLabel ?? 'Backend conventions'}
            backHref="?package=pkg-1"
            packageId={
              scope.packageId === undefined
                ? ('pkg-1' as PackageId)
                : scope.packageId
            }
            editHref="/edit"
            tab={tab}
            onTabChange={onTabChange}
            orgSlug="acme"
            spaceSlug="core"
            moveLabel={scope.moveLabel ?? 'Move'}
            onMove={vi.fn()}
            onRemove={scope.onRemove === undefined ? vi.fn() : scope.onRemove}
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
  (useCanEditSkillFiles as Mock).mockReturnValue(false);
  (useListChangeProposalsByCommandQuery as Mock).mockReturnValue({
    data: undefined,
  });
  (useListChangeProposalsByStandardQuery as Mock).mockReturnValue({
    data: undefined,
  });
  (useListChangeProposalsBySkillQuery as Mock).mockReturnValue({
    data: undefined,
  });
  (useGetRulesByStandardIdQuery as Mock).mockReturnValue({ data: [] });
  /* The answer of a standard no detection program was ever written for. */
  (useGetStandardRulesDetectionStatusQuery as Mock).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
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

    /*
      The second field, which the command's page hid behind a link with the
      same words as the first one. Named after the tab it edits.
    */
    it('offers the instructions as the other field a change can be proposed on', async () => {
      auth.value = {
        organization: { id: 'org-1' },
        user: { email: 'dev@packmind.com' },
      };
      await renderDetail(componentOfType('command', COMMAND_ID));
      await openActions();

      expect(
        screen.getByRole('menuitem', { name: /propose instructions change/i }),
      ).toBeVisible();
    });

    it('hides the instructions one too, from a reader outside the flag', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));
      await openActions();

      expect(
        screen.queryByRole('menuitem', {
          name: /propose instructions change/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('the way out of the surface', () => {
    /*
      The button this whole redesign is about. It read as the way to open the
      component whose header it sat in, and opened a page whose first screen was
      a copy of what was already on screen.
    */
    it('is gone from a command', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.queryByRole('link', { name: /^open command$/i }),
      ).not.toBeInTheDocument();
    });

    it('is gone from a standard', async () => {
      await renderDetail(componentOfType('standard', STANDARD_ID));

      expect(
        screen.queryByRole('link', { name: /^open standard$/i }),
      ).not.toBeInTheDocument();
    });

    it('is gone from a skill', async () => {
      await renderDetail(componentOfType('skill', SKILL_ID));

      expect(
        screen.queryByRole('link', { name: /^open skill$/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("setting up a standard's rules", () => {
    /*
      The one thing the pane cannot carry: the code examples that decide which
      languages a rule can be detected in, the linter program per language, and
      the severity it reports at. On the row of the rule they belong to rather
      than above the list, because a rule is the thing that gets configured.
    */
    function withOneRule() {
      (useGetStandardByIdQuery as Mock).mockReturnValue({
        data: { standard: { slug: 'naming', description: '' } },
      });
      (useGetRulesByStandardIdQuery as Mock).mockReturnValue({
        data: [{ id: 'rule-1', content: 'Event name ends with the verb' }],
      });
    }

    it('is offered on the row of a rule nothing detects, which is the row that needs it', async () => {
      withOneRule();
      await renderDetail(
        componentOfType('standard', STANDARD_ID),
        INSTRUCTIONS_TAB,
      );

      expect(screen.getByRole('link', { name: 'Configure' })).toHaveAttribute(
        'href',
        '/org/acme/space/core/standards/standard-1/rule/rule-1?package=pkg-1',
      );
    });

    it('is offered once per rule', async () => {
      withOneRule();
      (useGetRulesByStandardIdQuery as Mock).mockReturnValue({
        data: [
          { id: 'rule-1', content: 'Event name ends with the verb' },
          { id: 'rule-2', content: 'Property names are camelCase' },
        ],
      });
      await renderDetail(
        componentOfType('standard', STANDARD_ID),
        INSTRUCTIONS_TAB,
      );

      expect(screen.getAllByRole('link', { name: 'Configure' })).toHaveLength(
        2,
      );
    });

    /*
      The package the reader is in, carried onto the page that opens so its own
      back link returns here rather than to whichever package the rail lists
      first for a standard two of them carry.
    */
    it('carries no package when the standard is read outside one', async () => {
      withOneRule();
      await renderDetail(
        componentOfType('standard', STANDARD_ID),
        INSTRUCTIONS_TAB,
        vi.fn(),
        { packageId: null },
      );

      expect(screen.getByRole('link', { name: 'Configure' })).toHaveAttribute(
        'href',
        '/org/acme/space/core/standards/standard-1/rule/rule-1',
      );
    });

    /*
      The list of rules is the pane's own now. The link above it led to a second
      copy of it, one screen away, holding a name, a linter status and a
      severity this pane prints itself.
    */
    it('no longer offers the rules table as a stop on the way', async () => {
      withOneRule();
      await renderDetail(
        componentOfType('standard', STANDARD_ID),
        INSTRUCTIONS_TAB,
      );

      expect(
        screen.queryByRole('link', { name: /manage rules/i }),
      ).not.toBeInTheDocument();
    });

    describe('when the component is a command', () => {
      it('is absent, a command having no rules', async () => {
        (useGetCommandByIdQuery as Mock).mockReturnValue({
          data: { slug: 'run-migrations', content: 'body' },
        });
        await renderDetail(
          componentOfType('command', COMMAND_ID),
          INSTRUCTIONS_TAB,
        );

        expect(
          screen.queryByRole('link', { name: 'Configure' }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("editing a skill's instructions", () => {
    /*
      The other half of the regression increments 6 and 7 opened. A skill has no
      `Edit` in its header because it has no single form, and its instructions
      were editable only on the page that stopped answering.
    */
    const loadedSkill = () => {
      (useGetSkillWithFilesByIdQuery as Mock).mockReturnValue({
        data: {
          skill: { id: SKILL_ID, slug: 'release-checklist' },
          files: [],
          latestVersion: { version: 3, prompt: 'Cut the tag.' },
        },
      });
    };

    describe('when the reader may edit the skill', () => {
      it('offers the pencil', async () => {
        loadedSkill();
        (useCanEditSkillFiles as Mock).mockReturnValue(true);
        await renderDetail(
          componentOfType('skill', SKILL_ID),
          INSTRUCTIONS_TAB,
        );

        expect(
          screen.getByRole('button', { name: /edit instructions/i }),
        ).toBeVisible();
      });

      it('gives the prose over to the editor when it is pressed', async () => {
        loadedSkill();
        (useCanEditSkillFiles as Mock).mockReturnValue(true);
        await renderDetail(
          componentOfType('skill', SKILL_ID),
          INSTRUCTIONS_TAB,
        );
        await act(async () => {
          screen.getByRole('button', { name: /edit instructions/i }).click();
        });

        expect(screen.getByTestId('skill-file-editor')).toHaveTextContent(
          'SKILL.md',
        );
      });
    });

    describe('when the reader may not', () => {
      it('does not offer it', async () => {
        loadedSkill();
        (useCanEditSkillFiles as Mock).mockReturnValue(false);
        await renderDetail(
          componentOfType('skill', SKILL_ID),
          INSTRUCTIONS_TAB,
        );

        expect(
          screen.queryByRole('button', { name: /edit instructions/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('taking a skill away with you', () => {
    it('offers the download on a skill', async () => {
      await renderDetail(componentOfType('skill', SKILL_ID));

      expect(screen.getByTestId('download-skill')).toBeInTheDocument();
    });

    /* Neither of the other two is a folder anyone runs. */
    it('does not offer it on a command', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(screen.queryByTestId('download-skill')).not.toBeInTheDocument();
    });

    it('does not offer it on a standard', async () => {
      await renderDetail(componentOfType('standard', STANDARD_ID));

      expect(screen.queryByTestId('download-skill')).not.toBeInTheDocument();
    });
  });

  /*
    The rules page carried this until the prose block that held it went, and
    that block was the only place in the product that handed a standard over as
    the file an agent reads.
  */
  describe('taking a standard away with you', () => {
    it('offers the copy on a standard', async () => {
      (useGetStandardByIdQuery as Mock).mockReturnValue({
        data: { standard: { slug: 'naming', description: '' } },
      });
      await renderDetail(componentOfType('standard', STANDARD_ID));

      expect(
        screen.getByRole('button', { name: /copy markdown/i }),
      ).toBeInTheDocument();
    });

    /* Nothing to serialise yet, and a copy control is a promise about content. */
    it('offers nothing while the standard is still loading', async () => {
      (useGetStandardByIdQuery as Mock).mockReturnValue({ data: undefined });
      await renderDetail(componentOfType('standard', STANDARD_ID));

      expect(
        screen.queryByRole('button', { name: /copy markdown/i }),
      ).not.toBeInTheDocument();
    });

    it('does not offer it on a command', async () => {
      await renderDetail(componentOfType('command', COMMAND_ID));

      expect(
        screen.queryByRole('button', { name: /copy markdown/i }),
      ).not.toBeInTheDocument();
    });

    /* A skill is a folder, and the download beside it is what hands that over. */
    it('does not offer it on a skill', async () => {
      await renderDetail(componentOfType('skill', SKILL_ID));

      expect(
        screen.queryByRole('button', { name: /copy markdown/i }),
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

describe('whether a rule is detected automatically', () => {
  const FIRST_RULE = createRuleId('rule-1');
  const SECOND_RULE = createRuleId('rule-2');

  const updateSeverity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
    (useGetStandardByIdQuery as Mock).mockReturnValue({
      data: { standard: { slug: 'naming', description: '' } },
    });
    (useUpdateActiveDetectionProgramSeverityMutation as Mock).mockReturnValue({
      mutate: updateSeverity,
      isPending: false,
    });
  });

  function withRules(...contents: string[]) {
    (useGetRulesByStandardIdQuery as Mock).mockReturnValue({
      data: contents.map((content, index) => ({
        id: index === 0 ? FIRST_RULE : SECOND_RULE,
        content,
      })),
    });
  }

  function withStatuses(...summaries: RuleDetectionStatusSummary[]) {
    (useGetStandardRulesDetectionStatusQuery as Mock).mockReturnValue({
      data: summaries,
      isLoading: false,
      isError: false,
    });
  }

  function statusesFor(
    ruleId: RuleDetectionStatusSummary['ruleId'],
    languages: [ProgrammingLanguage, RuleLanguageDetectionStatus][],
  ): RuleDetectionStatusSummary {
    return {
      ruleId,
      languages: languages.map(([language, status]) => ({ language, status })),
    };
  }

  async function renderStandard() {
    await renderDetail(
      componentOfType('standard', STANDARD_ID),
      INSTRUCTIONS_TAB,
    );
  }

  describe('when no detection program was ever written', () => {
    beforeEach(() => {
      withRules('Event name ends with the verb');
    });

    it('still prints the rule', async () => {
      await renderStandard();

      expect(screen.getByText('Event name ends with the verb')).toBeVisible();
    });

    it('offers nothing to open, the rendering the OSS edition gets', async () => {
      await renderStandard();

      expect(
        screen.queryByRole('button', { name: /active|in progress/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the rule is active in its only language', () => {
    beforeEach(() => {
      withRules('Event name ends with the verb');
      withStatuses(
        statusesFor(FIRST_RULE, [
          [ProgrammingLanguage.TYPESCRIPT, RuleLanguageDetectionStatus.OK],
        ]),
      );
    });

    it('names the language on the row', async () => {
      await renderStandard();

      expect(screen.getByText('Active in TYPESCRIPT')).toBeVisible();
    });

    it('offers nothing to open, since the row said it all', async () => {
      await renderStandard();

      expect(
        screen.queryByRole('button', { name: /active in/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the rule is active in one language out of two', () => {
    beforeEach(() => {
      withRules('Event name ends with the verb');
      withStatuses(
        statusesFor(FIRST_RULE, [
          [ProgrammingLanguage.TYPESCRIPT, RuleLanguageDetectionStatus.OK],
          [ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.NONE],
        ]),
      );
    });

    it('keeps the languages shut until asked', async () => {
      await renderStandard();

      expect(screen.queryByText('Languages')).not.toBeInTheDocument();
    });

    it('opens onto them', async () => {
      await renderStandard();
      await userEvent.click(
        screen.getByRole('button', { name: /active in TYPESCRIPT/i }),
      );

      expect(screen.getByText('PYTHON')).toBeVisible();
    });

    it('shuts again on a second click', async () => {
      await renderStandard();
      const trigger = screen.getByRole('button', {
        name: /active in TYPESCRIPT/i,
      });
      await userEvent.click(trigger);
      await userEvent.click(trigger);

      expect(screen.queryByText('Languages')).not.toBeInTheDocument();
    });
  });

  /*
    The one setting on this tab, and the only reason a rule active in its one
    and only language has anything to open onto.
  */
  describe('when the language reports at a severity', () => {
    const PROGRAM_ID = 'program-1' as ActiveDetectionProgramId;

    beforeEach(() => {
      withRules('Event name ends with the verb');
      (useGetStandardRulesDetectionStatusQuery as Mock).mockReturnValue({
        data: [
          {
            ruleId: FIRST_RULE,
            languages: [
              {
                language: ProgrammingLanguage.JAVA,
                status: RuleLanguageDetectionStatus.OK,
                severity: DetectionSeverity.WARNING,
                activeDetectionProgramId: PROGRAM_ID,
              },
            ],
          },
        ],
        isLoading: false,
        isError: false,
      });
    });

    async function openLanguages() {
      await renderStandard();
      await userEvent.click(
        screen.getByRole('button', { name: /active in JAVA/i }),
      );
    }

    it('offers the severity beside the language', async () => {
      await openLanguages();

      expect(
        screen.getByRole('button', { name: 'Reported as warning in JAVA' }),
      ).toBeVisible();
    });

    it('leaves the collapsed row saying nothing about it', async () => {
      await renderStandard();

      expect(
        screen.queryByRole('button', { name: /reported as/i }),
      ).not.toBeInTheDocument();
    });

    it('sets the other severity on the program behind that language', async () => {
      await openLanguages();
      await userEvent.click(
        screen.getByRole('button', { name: 'Reported as warning in JAVA' }),
      );
      await userEvent.click(
        screen.getByRole('menuitem', { name: 'Report as error' }),
      );

      expect(updateSeverity).toHaveBeenCalledWith({
        standardId: STANDARD_ID,
        ruleId: FIRST_RULE,
        activeDetectionProgramId: PROGRAM_ID,
        severity: DetectionSeverity.ERROR,
      });
    });
  });

  describe('when a language is still being worked on beside one that reports', () => {
    beforeEach(() => {
      withRules('Event name ends with the verb');
      (useGetStandardRulesDetectionStatusQuery as Mock).mockReturnValue({
        data: [
          {
            ruleId: FIRST_RULE,
            languages: [
              {
                language: ProgrammingLanguage.JAVA,
                status: RuleLanguageDetectionStatus.OK,
                severity: DetectionSeverity.ERROR,
                activeDetectionProgramId:
                  'program-1' as ActiveDetectionProgramId,
              },
              {
                language: ProgrammingLanguage.PYTHON,
                status: RuleLanguageDetectionStatus.WIP,
              },
            ],
          },
        ],
        isLoading: false,
        isError: false,
      });
    });

    /* Nothing is being reported yet, so there is nothing to choose. */
    it('offers a severity for the reporting language only', async () => {
      await renderStandard();
      await userEvent.click(
        screen.getByRole('button', { name: /active in JAVA/i }),
      );

      expect(
        screen.getAllByRole('button', { name: /reported as/i }),
      ).toHaveLength(1);
    });
  });

  describe('when the only language is still being worked on', () => {
    beforeEach(() => {
      withRules('Event name ends with the verb');
      withStatuses(
        statusesFor(FIRST_RULE, [
          [ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.WIP],
        ]),
      );
    });

    it('says so in the words the detection screens use', async () => {
      await renderStandard();

      expect(screen.getByText('In progress')).toBeVisible();
    });

    it('opens, since the row named no language', async () => {
      await renderStandard();

      expect(
        screen.getByRole('button', { name: /in progress/i }),
      ).toBeInTheDocument();
    });
  });

  describe('when a language was answered for but nothing detects it', () => {
    beforeEach(() => {
      withRules('Event name ends with the verb');
      withStatuses(
        statusesFor(FIRST_RULE, [
          [ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.NONE],
        ]),
      );
    });

    it('says the rule is not active', async () => {
      await renderStandard();

      expect(screen.getByText('Not active')).toBeVisible();
    });
  });

  describe('when two rules of the same standard both open', () => {
    beforeEach(() => {
      withRules('Event name ends with the verb', 'Property name is camel case');
      withStatuses(
        statusesFor(FIRST_RULE, [
          [ProgrammingLanguage.TYPESCRIPT, RuleLanguageDetectionStatus.OK],
          [ProgrammingLanguage.PYTHON, RuleLanguageDetectionStatus.NONE],
        ]),
        statusesFor(SECOND_RULE, [
          [ProgrammingLanguage.JAVA, RuleLanguageDetectionStatus.WIP],
        ]),
      );
    });

    /* The comparison the set of open rows exists for. */
    it('leaves both open rather than closing the first', async () => {
      await renderStandard();
      await userEvent.click(
        screen.getByRole('button', { name: /active in TYPESCRIPT/i }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /in progress/i }),
      );

      expect(screen.getAllByText('Languages')).toHaveLength(2);
    });
  });
});

describe('a component read with no package around it', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
  });

  const SPACE_WIDE = {
    backLabel: 'All components',
    moveLabel: 'Add to package',
    onRemove: null,
  } as const;

  it('names the inventory in the back link, since that is where it goes', async () => {
    await renderDetail(
      componentOfType('standard', STANDARD_ID),
      DISTRIBUTION_TAB,
      vi.fn(),
      SPACE_WIDE,
    );

    expect(screen.getByRole('link', { name: /all components/i })).toBeVisible();
  });

  /* "Move" is a sentence about leaving a place, and there is no place. */
  it('offers to add it to a package rather than to move it', async () => {
    await renderDetail(
      componentOfType('standard', STANDARD_ID),
      DISTRIBUTION_TAB,
      vi.fn(),
      SPACE_WIDE,
    );

    expect(
      screen.getByRole('button', { name: 'Add to package' }),
    ).toBeVisible();
  });

  it('does not offer to remove it from a package', async () => {
    await renderDetail(
      componentOfType('standard', STANDARD_ID),
      DISTRIBUTION_TAB,
      vi.fn(),
      SPACE_WIDE,
    );
    await openActions();

    expect(
      screen.queryByRole('menuitem', { name: /remove from package/i }),
    ).not.toBeInTheDocument();
  });

  /* The one action that is the same either way: it leaves the space. */
  it('still offers to delete it', async () => {
    await renderDetail(
      componentOfType('standard', STANDARD_ID),
      DISTRIBUTION_TAB,
      vi.fn(),
      SPACE_WIDE,
    );
    await openActions();

    expect(
      screen.getByRole('menuitem', { name: /delete standard/i }),
    ).toBeVisible();
  });
});

describe('a component read inside a package', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToEmpty();
  });

  it('offers to remove it from that package', async () => {
    await renderDetail(componentOfType('standard', STANDARD_ID));
    await openActions();

    expect(
      screen.getByRole('menuitem', { name: /remove from package/i }),
    ).toBeVisible();
  });
});
