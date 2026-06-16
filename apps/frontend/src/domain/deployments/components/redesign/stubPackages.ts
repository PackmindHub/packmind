/**
 * Hand-crafted stub data to visualise the deployments-v2 page without a real backend.
 * Activated by `?stub=1` in dev. Covers the three drift reasons
 * (`behind` / `needs-removal` / `not-distributed`) and every DistributionStatus.
 */
import {
  DistributionStatus,
  createGitProviderId,
  createGitRepoId,
  createPackageId,
  createRecipeId,
  createSkillId,
  createStandardId,
  createTargetId,
} from '@packmind/types';
import type {
  ArtifactDrift,
  InstallLocation,
  PackageDrift,
  RepoRef,
  RepositoryDrift,
  TargetDrift,
  TargetRef,
} from './types';
import type { GitRepoId, TargetId } from '@packmind/types';

export const STUB_PROVIDER_OK = createGitProviderId('prov-ok');
export const STUB_PROVIDER_NO_TOKEN = createGitProviderId('prov-no-token');

const WEBAPP: RepoRef = {
  id: createGitRepoId('repo-webapp'),
  owner: 'acme',
  name: 'webapp',
  providerId: STUB_PROVIDER_OK,
};
const BACKEND: RepoRef = {
  id: createGitRepoId('repo-backend'),
  owner: 'acme',
  name: 'backend',
  providerId: STUB_PROVIDER_OK,
};
const LANDING: RepoRef = {
  id: createGitRepoId('repo-landing'),
  owner: 'acme',
  name: 'landing',
  providerId: STUB_PROVIDER_OK,
};
const MOBILE: RepoRef = {
  id: createGitRepoId('repo-mobile'),
  owner: 'acme',
  name: 'mobile',
  providerId: STUB_PROVIDER_NO_TOKEN,
};

const ROOT_WEB: TargetRef = {
  id: createTargetId('t-web-root'),
  name: 'root',
  isDefault: true,
};
const ROOT_BACKEND: TargetRef = {
  id: createTargetId('t-backend-root'),
  name: 'root',
  isDefault: true,
};
const ROOT_LANDING: TargetRef = {
  id: createTargetId('t-landing-root'),
  name: 'root',
  isDefault: true,
};
const ROOT_MOBILE: TargetRef = {
  id: createTargetId('t-mobile-root'),
  name: 'root',
  isDefault: true,
};
const WEB_SUB: TargetRef = {
  id: createTargetId('t-web-sub'),
  name: 'apps/web',
};

const NOW = '2026-06-12T09:00:00Z';
const TWO_DAYS_AGO = '2026-06-10T09:00:00Z';
const TEN_DAYS_AGO = '2026-06-02T09:00:00Z';
const THIRTY_DAYS_AGO = '2026-05-13T09:00:00Z';
const NINETY_DAYS_AGO = '2026-03-14T09:00:00Z';

export const STUB_PACKAGES: PackageDrift[] = [
  {
    id: createPackageId('pkg-stub-backend-core'),
    name: 'Backend Core',
    description: 'Foundational standards and recipes shared across services.',
    artifacts: [
      {
        id: createStandardId('std-naming'),
        kind: 'standard',
        name: 'Naming conventions',
        packmindVersion: 5,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: WEBAPP,
            target: ROOT_WEB,
            branch: 'main',
            deployedVersion: 3,
            lastDeployedAt: TEN_DAYS_AGO,
            driftReason: 'behind',
          },
          {
            repo: BACKEND,
            target: ROOT_BACKEND,
            branch: 'main',
            deployedVersion: 5,
            lastDeployedAt: TWO_DAYS_AGO,
            driftReason: 'aligned',
          },
          {
            repo: MOBILE,
            target: ROOT_MOBILE,
            branch: 'main',
            deployedVersion: 4,
            lastDeployedAt: THIRTY_DAYS_AGO,
            driftReason: 'behind',
          },
        ],
      },
      {
        id: createRecipeId('rcp-release'),
        kind: 'command',
        name: 'release',
        packmindVersion: 3,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: WEBAPP,
            target: ROOT_WEB,
            branch: 'main',
            deployedVersion: 1,
            lastDeployedAt: THIRTY_DAYS_AGO,
            driftReason: 'behind',
          },
          {
            repo: BACKEND,
            target: ROOT_BACKEND,
            branch: 'main',
            deployedVersion: 3,
            lastDeployedAt: TWO_DAYS_AGO,
            driftReason: 'aligned',
          },
          {
            repo: MOBILE,
            target: ROOT_MOBILE,
            branch: 'main',
            deployedVersion: 2,
            lastDeployedAt: NINETY_DAYS_AGO,
            driftReason: 'behind',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: WEBAPP,
        target: ROOT_WEB,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.success,
        lastDistributedAt: TEN_DAYS_AGO,
      },
      {
        repo: BACKEND,
        target: ROOT_BACKEND,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.success,
        lastDistributedAt: TWO_DAYS_AGO,
      },
      {
        repo: MOBILE,
        target: ROOT_MOBILE,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.success,
        lastDistributedAt: THIRTY_DAYS_AGO,
      },
    ],
  },
  {
    id: createPackageId('pkg-stub-auth'),
    name: 'Auth Module',
    description: 'Session, JWT and identity primitives.',
    artifacts: [
      {
        id: createStandardId('std-session-old'),
        kind: 'standard',
        name: 'Session policy (legacy)',
        packmindVersion: 2,
        isDeleted: true,
        isPending: false,
        installs: [
          {
            repo: BACKEND,
            target: ROOT_BACKEND,
            branch: 'main',
            deployedVersion: 2,
            lastDeployedAt: THIRTY_DAYS_AGO,
            driftReason: 'needs-removal',
          },
        ],
      },
      {
        id: createStandardId('std-jwt'),
        kind: 'standard',
        name: 'JWT configuration',
        packmindVersion: 1,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: BACKEND,
            target: ROOT_BACKEND,
            branch: 'main',
            deployedVersion: 1,
            lastDeployedAt: THIRTY_DAYS_AGO,
            driftReason: 'aligned',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: BACKEND,
        target: ROOT_BACKEND,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.success,
        lastDistributedAt: THIRTY_DAYS_AGO,
      },
    ],
  },
  {
    id: createPackageId('pkg-stub-onboarding'),
    name: 'Onboarding',
    description: 'New-user welcome flow and supporting standards.',
    artifacts: [
      {
        id: createRecipeId('rcp-welcome'),
        kind: 'command',
        name: 'welcome',
        packmindVersion: 2,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: WEBAPP,
            target: WEB_SUB,
            branch: 'main',
            deployedVersion: 2,
            lastDeployedAt: TWO_DAYS_AGO,
            driftReason: 'aligned',
          },
        ],
      },
      {
        id: createStandardId('std-welcome'),
        kind: 'standard',
        name: 'Welcome copywriting',
        packmindVersion: 0,
        isDeleted: false,
        isPending: true,
        installs: [
          {
            repo: WEBAPP,
            target: WEB_SUB,
            branch: 'main',
            deployedVersion: 0,
            lastDeployedAt: '',
            driftReason: 'not-distributed',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: WEBAPP,
        target: WEB_SUB,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.success,
        lastDistributedAt: TWO_DAYS_AGO,
      },
    ],
  },
  {
    id: createPackageId('pkg-stub-payments'),
    name: 'Payments',
    description: 'PCI-compliant payment flow and audit standards.',
    artifacts: [
      {
        id: createStandardId('std-pci'),
        kind: 'standard',
        name: 'PCI checklist',
        packmindVersion: 3,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: BACKEND,
            target: ROOT_BACKEND,
            branch: 'main',
            deployedVersion: 2,
            lastDeployedAt: THIRTY_DAYS_AGO,
            driftReason: 'behind',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: BACKEND,
        target: ROOT_BACKEND,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.in_progress,
        lastDistributedAt: NOW,
      },
    ],
  },
  {
    id: createPackageId('pkg-stub-mobile-dx'),
    name: 'Mobile DX',
    description: 'Mobile build pipeline and release rituals.',
    artifacts: [
      {
        id: createRecipeId('rcp-mobile-build'),
        kind: 'command',
        name: 'mobile-build',
        packmindVersion: 4,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: MOBILE,
            target: ROOT_MOBILE,
            branch: 'main',
            deployedVersion: 2,
            lastDeployedAt: NINETY_DAYS_AGO,
            driftReason: 'behind',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: MOBILE,
        target: ROOT_MOBILE,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.failure,
        lastDistributedAt: TWO_DAYS_AGO,
      },
    ],
  },
  {
    id: createPackageId('pkg-stub-design-system'),
    name: 'Design System',
    description: 'Color tokens, typography and component primitives.',
    artifacts: [
      {
        id: createStandardId('std-color'),
        kind: 'standard',
        name: 'Color tokens',
        packmindVersion: 7,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: WEBAPP,
            target: ROOT_WEB,
            branch: 'main',
            deployedVersion: 7,
            lastDeployedAt: TWO_DAYS_AGO,
            driftReason: 'aligned',
          },
          {
            repo: LANDING,
            target: ROOT_LANDING,
            branch: 'feature/redesign',
            deployedVersion: 7,
            lastDeployedAt: TWO_DAYS_AGO,
            driftReason: 'aligned',
          },
        ],
      },
      {
        id: createSkillId('skl-color-review'),
        kind: 'skill',
        name: 'Color review',
        packmindVersion: 1,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: WEBAPP,
            target: ROOT_WEB,
            branch: 'main',
            deployedVersion: 1,
            lastDeployedAt: TWO_DAYS_AGO,
            driftReason: 'aligned',
          },
          {
            repo: LANDING,
            target: ROOT_LANDING,
            branch: 'feature/redesign',
            deployedVersion: 1,
            lastDeployedAt: TWO_DAYS_AGO,
            driftReason: 'aligned',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: WEBAPP,
        target: ROOT_WEB,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.success,
        lastDistributedAt: TWO_DAYS_AGO,
      },
      {
        repo: LANDING,
        target: ROOT_LANDING,
        branch: 'feature/redesign',
        lastDistributionStatus: DistributionStatus.no_changes,
        lastDistributedAt: TWO_DAYS_AGO,
      },
    ],
  },
  {
    id: createPackageId('pkg-stub-legacy-lint'),
    name: 'Legacy Lint',
    description: 'Lint rules left over from the previous lint stack.',
    artifacts: [
      {
        id: createStandardId('std-legacy-lint'),
        kind: 'standard',
        name: 'Legacy ESLint rules',
        packmindVersion: 1,
        isDeleted: false,
        isPending: false,
        installs: [
          {
            repo: BACKEND,
            target: ROOT_BACKEND,
            branch: 'main',
            deployedVersion: 1,
            lastDeployedAt: NINETY_DAYS_AGO,
            driftReason: 'aligned',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: BACKEND,
        target: ROOT_BACKEND,
        branch: 'main',
        lastDistributionStatus: DistributionStatus.success,
        lastDistributedAt: NINETY_DAYS_AGO,
      },
    ],
  },
];

/**
 * Pivots STUB_PACKAGES into the repository-centric shape so the
 * /deployments-v2?view=repositories stub render matches the by-packages stub.
 * The function is structurally equivalent to `buildRepositoryDriftOverview`
 * but starts from the already-built PackageDrift[] (no API payload).
 */
function pivotPackagesIntoRepositories(
  packages: PackageDrift[],
): RepositoryDrift[] {
  type RepoAccumulator = {
    id: GitRepoId;
    repo: RepoRef;
    branch: string;
    targets: Map<TargetId, { target: TargetRef; packages: PackageDrift[] }>;
  };
  const repos = new Map<GitRepoId, RepoAccumulator>();

  for (const pkg of packages) {
    for (const loc of pkg.installLocations) {
      let r = repos.get(loc.repo.id);
      if (!r) {
        r = {
          id: loc.repo.id,
          repo: loc.repo,
          branch: loc.branch,
          targets: new Map(),
        };
        repos.set(loc.repo.id, r);
      }
      let t = r.targets.get(loc.target.id);
      if (!t) {
        t = { target: loc.target, packages: [] };
        r.targets.set(loc.target.id, t);
      }
      const scopedArtifacts: ArtifactDrift[] = pkg.artifacts
        .map((a) => ({
          ...a,
          installs: a.installs.filter(
            (i) => i.repo.id === loc.repo.id && i.target.id === loc.target.id,
          ),
        }))
        .filter((a) => a.installs.length > 0);
      const scopedInstallLocation: InstallLocation = loc;
      t.packages.push({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        artifacts: scopedArtifacts,
        installLocations: [scopedInstallLocation],
      });
    }
  }

  return Array.from(repos.values()).map((r) => ({
    id: r.id,
    repo: r.repo,
    branch: r.branch,
    targets: Array.from(r.targets.values()).map<TargetDrift>((t) => ({
      id: t.target.id,
      target: t.target,
      packages: t.packages,
    })),
  }));
}

export const STUB_REPOSITORIES: RepositoryDrift[] =
  pivotPackagesIntoRepositories(STUB_PACKAGES);
