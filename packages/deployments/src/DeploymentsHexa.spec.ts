import { DataSource, Repository } from 'typeorm';
import {
  HexaRegistry,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { DeploymentsHexa } from './DeploymentsHexa';

describe('DeploymentsHexa', () => {
  describe('initialize', () => {
    it('initializes job queues so the marketplace-reconciliation worker starts at boot', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({} as Repository<unknown>),
      } as unknown as DataSource;

      const hexa = new DeploymentsHexa(dataSource, { logger: stubLogger() });

      // Bypass the heavy adapter wiring — we only care that initialize() drives
      // job-queue initialization. The adapter is exercised in DeploymentsAdapter.spec.ts.
      const removePluginJob = {
        addJob: jest.fn(),
      } as unknown as ReturnType<
        DeploymentsHexa['adapter']['getRemovePluginFromMarketplaceJob']
      >;
      const adapterStub = {
        initialize: jest.fn().mockResolvedValue(undefined),
        getRemovePluginFromMarketplaceJob: jest
          .fn()
          .mockReturnValue(removePluginJob),
      };
      (hexa as unknown as { adapter: typeof adapterStub }).adapter =
        adapterStub;

      const initJobQueues = jest.fn().mockResolvedValue(undefined);
      const jobsService = {
        initJobQueues,
      } as unknown as JobsService;

      const eventEmitterService = {
        on: jest.fn(),
      } as unknown as PackmindEventEmitterService;

      const registry = {
        getAdapter: jest.fn().mockReturnValue({}),
        getService: jest.fn().mockImplementation((cls: unknown) => {
          if (cls === JobsService) return jobsService;
          if (cls === PackmindEventEmitterService) return eventEmitterService;
          return undefined;
        }),
      } as unknown as HexaRegistry;

      await hexa.initialize(registry);

      expect(initJobQueues).toHaveBeenCalledTimes(1);
    });
  });
});
