import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  ILinterPort,
  PlaybookArtefactMovedEvent,
  createSpaceId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { LinterListener } from './LinterListener';

describe('LinterListener', () => {
  let eventService: PackmindEventEmitterService;
  let mockLinterPort: jest.Mocked<ILinterPort>;
  let listener: LinterListener;
  let mockDataSource: DataSource;

  const sourceSpaceId = createSpaceId('source-space');
  const destinationSpaceId = createSpaceId('dest-space');
  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-456');

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    eventService = new PackmindEventEmitterService(mockDataSource);

    mockLinterPort = {} as unknown as jest.Mocked<ILinterPort>;

    listener = new LinterListener(mockLinterPort, stubLogger());
    listener.initialize(eventService);
  });

  afterEach(() => {
    eventService.removeAllListeners();
    jest.clearAllMocks();
  });

  describe('when PlaybookArtefactMovedEvent is emitted', () => {
    it('handles the event without error', async () => {
      const event = new PlaybookArtefactMovedEvent({
        artifactType: 'standard',
        oldArtifactId: 'old-standard-id',
        newArtifactId: 'new-standard-id',
        sourceSpaceId,
        destinationSpaceId,
        userId,
        organizationId,
        source: 'ui',
      });

      await expect(async () => {
        eventService.emit(event);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }).not.toThrow();
    });
  });
});
