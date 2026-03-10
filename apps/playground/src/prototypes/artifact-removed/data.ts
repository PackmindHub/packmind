import { StubPackage, StubRemovalProposal, StubRepository } from './types';

export const STUB_REPOSITORIES: StubRepository[] = [
  { id: 'repo-1', name: 'acme/frontend' },
  { id: 'repo-2', name: 'acme/backend-api' },
];

export const STUB_PACKAGES: StubPackage[] = [
  { id: 'pkg-1', name: 'Frontend Standards' },
  { id: 'pkg-2', name: 'Backend Conventions' },
  { id: 'pkg-3', name: 'DevOps Playbook' },
];

export const STUB_REMOVAL_PROPOSALS: StubRemovalProposal[] = [
  {
    id: 'rp-1',
    number: 1,
    artefactType: 'standard',
    artefactName: 'Legacy naming conventions',
    author: 'joan',
    createdAt: '2 hours ago',
    poolStatus: 'pending',
    packageIds: ['pkg-1', 'pkg-2'],
    repositoryId: 'repo-1',
    targetPath: 'src/legacy',
    message:
      'This standard has been superseded by the new naming conventions standard.',
    decision: null,
  },
  {
    id: 'rp-2',
    number: 2,
    artefactType: 'command',
    artefactName: 'Deploy to legacy environment',
    author: 'alex',
    createdAt: '1 day ago',
    poolStatus: 'pending',
    packageIds: ['pkg-3'],
    repositoryId: 'repo-2',
    decision: null,
  },
  {
    id: 'rp-3',
    number: 3,
    artefactType: 'skill',
    artefactName: 'Old PR review assistant',
    author: 'joan',
    createdAt: '3 days ago',
    poolStatus: 'accepted',
    packageIds: ['pkg-1', 'pkg-2', 'pkg-3'],
    repositoryId: 'repo-1',
    targetPath: 'packages/review',
    decision: { delete: false, removeFromPackages: ['pkg-1', 'pkg-3'] },
  },
  {
    id: 'rp-4',
    number: 4,
    artefactType: 'standard',
    artefactName: 'Deprecated error handling',
    author: 'alex',
    createdAt: '5 days ago',
    poolStatus: 'dismissed',
    packageIds: ['pkg-2'],
    repositoryId: 'repo-2',
    decision: null,
  },
];
