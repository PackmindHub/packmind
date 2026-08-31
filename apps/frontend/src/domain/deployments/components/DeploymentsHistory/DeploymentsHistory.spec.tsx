import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  createDistributedPackageId,
  createDistributionId,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createTargetId,
  createUserId,
  DistributionStatus,
  RenderMode,
  type Distribution,
  type DistributionOperation,
} from '@packmind/types';

import { DeploymentsHistory } from './DeploymentsHistory';

const packageId = createPackageId('package-1');
const authorId = createUserId('user-1');
const LONG_ERROR =
  'Repository jracenet/sandbox-services is archived and cannot be written to';

const distribution = (
  index: number,
  overrides: Partial<Distribution> = {},
  operation: DistributionOperation = 'add',
): Distribution => ({
  id: createDistributionId(`distribution-${index}`),
  createdAt: '2026-08-31T10:56:00.000Z',
  authorId,
  organizationId: createOrganizationId('org-1'),
  status: DistributionStatus.success,
  renderModes: [RenderMode.AGENTS_MD],
  source: 'app',
  target: {
    id: createTargetId(`target-${index}`),
    name: 'default',
    path: 'packages/cli/',
    gitRepoId: createGitRepoId('repo-1'),
    gitRepo: {
      id: createGitRepoId('repo-1'),
      owner: 'PackmindHub',
      repo: 'packmind-proprietary',
      branch: 'main',
    },
  },
  distributedPackages: [
    {
      id: createDistributedPackageId(`distributed-${index}`),
      distributionId: createDistributionId(`distribution-${index}`),
      packageId,
      standardVersions: [],
      recipeVersions: [],
      skillVersions: [],
      operation,
    },
  ],
  ...overrides,
});

const renderHistory = (deployments: Distribution[]) =>
  render(
    <MemoryRouter>
      <UIProvider>
        <DeploymentsHistory
          deployments={deployments}
          type="package"
          entityId={packageId}
          usersMap={{ [authorId]: 'joan.racenet' }}
        />
      </UIProvider>
    </MemoryRouter>,
  );

/**
 * jsdom lays nothing out, so the two numbers the message cell measures itself
 * with are always zero. These fix them for the length of one test.
 */
const stubLayout = (scrollWidth: number, clientWidth: number) => {
  for (const [prop, value] of [
    ['scrollWidth', scrollWidth],
    ['clientWidth', clientWidth],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get: () => value,
    });
  }
};

afterEach(() => {
  for (const prop of ['scrollWidth', 'clientWidth']) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      value: 0,
    });
  }
});

describe('DeploymentsHistory', () => {
  const headers = () =>
    screen.getAllByRole('columnheader').map((cell) => cell.textContent);

  /*
   * Two columns printed the same value on nearly every row of the log, and
   * between them they held the width the error message needed to be read at
   * all.
   */
  describe('columns', () => {
    it('spends no column on the operation', () => {
      renderHistory([distribution(1)]);

      expect(headers()).not.toContain('Operation');
    });

    it('spends no column on the author', () => {
      renderHistory([distribution(1)]);

      expect(headers()).not.toContain('Author');
    });

    it('keeps the message, which is the one that runs out of room', () => {
      renderHistory([distribution(1)]);

      expect(headers()).toContain('Message');
    });
  });

  describe('when a distribution took the package out of a target', () => {
    it('says so beside the place, having no column left to say it in', () => {
      renderHistory([distribution(1, {}, 'remove')]);

      expect(screen.getByText('Removed')).toBeInTheDocument();
    });
  });

  describe('when a distribution put the package in', () => {
    it('says nothing, which is what forty-three rows out of forty-four say', () => {
      renderHistory([distribution(1)]);

      expect(screen.queryByText('Removed')).not.toBeInTheDocument();
    });
  });

  /*
   * The author is worth keeping and was not worth a column: it goes under the
   * date, where the target cell already puts the branch under the repository.
   */
  describe('the author', () => {
    it('stays readable without a column of its own', () => {
      renderHistory([distribution(1)]);

      expect(screen.getByText('joan.racenet')).toBeInTheDocument();
    });
  });

  describe('when a failed distribution says why', () => {
    it('shows the reason rather than the status alone', () => {
      renderHistory([
        distribution(1, {
          status: DistributionStatus.failure,
          error: LONG_ERROR,
        }),
      ]);

      expect(screen.getByText(LONG_ERROR)).toBeInTheDocument();
    });
  });

  /*
   * The tooltip is worth having for the message that does not fit and only for
   * that one. An unconditional one repeats a sentence the reader can already
   * see, over the row underneath it, on every row of a forty-row log.
   */
  describe('when the message fits its column', () => {
    it('adds no tooltip repeating what is on screen', async () => {
      stubLayout(200, 400);
      renderHistory([
        distribution(1, {
          status: DistributionStatus.failure,
          error: LONG_ERROR,
        }),
      ]);

      await userEvent.hover(screen.getByText(LONG_ERROR));

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('when the message is cut by its column', () => {
    it('puts the rest under the pointer', async () => {
      stubLayout(400, 200);
      renderHistory([
        distribution(1, {
          status: DistributionStatus.failure,
          error: LONG_ERROR,
        }),
      ]);

      await userEvent.hover(screen.getByText(LONG_ERROR));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(LONG_ERROR);
    });
  });
});
