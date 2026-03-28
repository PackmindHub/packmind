import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  ILinterPort,
  PlaybookArtefactMovedEvent,
  createSpaceId,
  createOrganizationId,
  createUserId,
  createRuleId,
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
  const oldRuleId = 'old-rule-id';
  const newRuleId = 'new-rule-id';

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    eventService = new PackmindEventEmitterService(mockDataSource);

    mockLinterPort = {
      dispatchMoveLinterArtefactsToNewRules: jest
        .fn()
        .mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ILinterPort>;

    listener = new LinterListener(mockLinterPort, stubLogger());
    listener.initialize(eventService);
  });

  afterEach(() => {
    eventService.removeAllListeners();
    jest.clearAllMocks();
  });

  describe('when PlaybookArtefactMovedEvent is emitted for a standard with rule mappings', () => {
    let event: PlaybookArtefactMovedEvent;

    beforeEach(() => {
      event = new PlaybookArtefactMovedEvent({
        artifactType: 'standard',
        oldArtifactId: 'old-standard-id',
        newArtifactId: 'new-standard-id',
        sourceSpaceId,
        destinationSpaceId,
        userId,
        organizationId,
        source: 'ui',
        ruleMappings: [{ oldRuleId, newRuleId }],
      });
    });

    it('calls dispatchMoveLinterArtefactsToNewRules on the adapter', async () => {
      eventService.emit(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockLinterPort.dispatchMoveLinterArtefactsToNewRules,
      ).toHaveBeenCalledWith({
        ruleMappings: [
          {
            oldRuleId: createRuleId(oldRuleId),
            newRuleId: createRuleId(newRuleId),
          },
        ],
        userId,
        organizationId,
      });
    });

    it('calls dispatchMoveLinterArtefactsToNewRules exactly once', async () => {
      eventService.emit(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockLinterPort.dispatchMoveLinterArtefactsToNewRules,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('when PlaybookArtefactMovedEvent is emitted for a non-standard artifact', () => {
    it('does not call dispatchMoveLinterArtefactsToNewRules', async () => {
      const event = new PlaybookArtefactMovedEvent({
        artifactType: 'skill',
        oldArtifactId: 'old-skill-id',
        newArtifactId: 'new-skill-id',
        sourceSpaceId,
        destinationSpaceId,
        userId,
        organizationId,
        source: 'ui',
      });

      eventService.emit(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockLinterPort.dispatchMoveLinterArtefactsToNewRules,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when PlaybookArtefactMovedEvent is emitted without rule mappings', () => {
    it('does not call dispatchMoveLinterArtefactsToNewRules', async () => {
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

      eventService.emit(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockLinterPort.dispatchMoveLinterArtefactsToNewRules,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when PlaybookArtefactMovedEvent is emitted with empty rule mappings', () => {
    it('does not call dispatchMoveLinterArtefactsToNewRules', async () => {
      const event = new PlaybookArtefactMovedEvent({
        artifactType: 'standard',
        oldArtifactId: 'old-standard-id',
        newArtifactId: 'new-standard-id',
        sourceSpaceId,
        destinationSpaceId,
        userId,
        organizationId,
        source: 'ui',
        ruleMappings: [],
      });

      eventService.emit(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockLinterPort.dispatchMoveLinterArtefactsToNewRules,
      ).not.toHaveBeenCalled();
    });
  });
});
