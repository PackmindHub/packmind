import { Test, TestingModule } from '@nestjs/testing';
import { AmplitudeController } from './amplitude.controller';
import { AmplitudeService } from './amplitude.service';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';

describe('AmplitudeController', () => {
  let controller: AmplitudeController;
  let service: AmplitudeService;

  beforeEach(async () => {
    const mockAmplitudeService = {
      getConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmplitudeController],
      providers: [
        {
          provide: AmplitudeService,
          useValue: mockAmplitudeService,
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();

    controller = module.get<AmplitudeController>(AmplitudeController);
    service = module.get<AmplitudeService>(AmplitudeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConfig', () => {
    it('returns amplitude configuration from service', async () => {
      const mockConfig = {
        amplitudeKey: 'test-key',
        amplitudeRegion: 'EU',
      };

      jest.spyOn(service, 'getConfig').mockResolvedValue(mockConfig);

      const result = await controller.getConfig();

      expect(result).toEqual(mockConfig);
      expect(service.getConfig).toHaveBeenCalledTimes(1);
    });
  });
});
