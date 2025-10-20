import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { spacesSchemas } from '@packmind/spaces';
import { PackmindLogger, LogLevel } from '@packmind/shared';

@Module({
  imports: [TypeOrmModule.forFeature(spacesSchemas)],
  controllers: [SpacesController],
  providers: [
    SpacesService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('SpacesModule', LogLevel.INFO),
    },
  ],
  exports: [SpacesService],
})
export class SpacesModule {}
