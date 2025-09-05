import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../../auth/auth.module';
import { LogLevel, PackmindLogger } from '@packmind/shared';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('UsersModule', LogLevel.INFO),
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
