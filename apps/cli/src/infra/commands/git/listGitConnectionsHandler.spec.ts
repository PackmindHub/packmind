import { GitProviderListItem, createGitProviderId } from '@packmind/types';
import {
  listGitConnectionsHandler,
  ListGitConnectionsHandlerDependencies,
} from './listGitConnectionsHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import * as consoleLogger from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  formatSlug: jest.fn((t: string) => t),
  formatLabel: jest.fn((t: string) => t),
}));

const mockLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

function getLoggedLines(): string[] {
  return mockLogger.logConsole.mock.calls.map(([msg]) => msg);
}

function buildConnection(
  overrides: Partial<GitProviderListItem> = {},
): GitProviderListItem {
  return {
    id: createGitProviderId('provider-1'),
    source: 'gitlab',
    organizationId: 'org-1',
    url: 'https://gitlab.example.com',
    authMethod: 'token',
    displayName: 'My GitLab',
    hasAuth: true,
    lastDistributionAt: null,
    ...overrides,
  } as GitProviderListItem;
}

describe('listGitConnectionsHandler', () => {
  let mockExit: jest.Mock;
  let mockListGitConnections: jest.Mock;
  let deps: ListGitConnectionsHandlerDependencies;

  beforeEach(() => {
    mockExit = jest.fn();
    mockListGitConnections = jest.fn();
    deps = {
      packmindCliHexa: {
        listGitConnections: mockListGitConnections,
      } as unknown as PackmindCliHexa,
      exit: mockExit,
    };
  });

  afterEach(() => jest.clearAllMocks());

  describe('when no connections exist', () => {
    beforeEach(() => {
      mockListGitConnections.mockResolvedValue([]);
    });

    it('reports that none were found', async () => {
      await listGitConnectionsHandler(deps);

      expect(getLoggedLines()).toContain('No git connections found.');
    });

    it('exits with code 0', async () => {
      await listGitConnectionsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when connections exist', () => {
    beforeEach(() => {
      mockListGitConnections.mockResolvedValue([buildConnection()]);
    });

    it('prints the connection display name', async () => {
      await listGitConnectionsHandler(deps);

      expect(getLoggedLines()).toContain('- My GitLab');
    });

    it('prints the connection id', async () => {
      await listGitConnectionsHandler(deps);

      expect(getLoggedLines()).toContain('    ID:   provider-1');
    });

    it('exits with code 0', async () => {
      await listGitConnectionsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when the fetch fails', () => {
    beforeEach(() => {
      mockListGitConnections.mockRejectedValue(new Error('boom'));
    });

    it('exits with code 1', async () => {
      await listGitConnectionsHandler(deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
