import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();
  });

  describe('getData', () => {
    it('returns "Hello API"', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getData()).toEqual({
        message: 'Hello api',
      });
    });
  });
});
