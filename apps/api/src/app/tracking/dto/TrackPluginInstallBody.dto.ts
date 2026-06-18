import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PluginInstallScope } from '@packmind/types';

/**
 * Validated body for `POST /tracking/plugin-installs`.
 *
 * All fields mirror `TrackPluginInstallHeartbeatCommand` minus `trackingToken`
 * (which arrives in the `X-Packmind-Tracking-Token` header) and `verifiedUserId`
 * (which the controller resolves from the `Authorization` header).
 */
export class TrackPluginInstallBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  pluginSlug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  marketplaceName!: string;

  @IsEnum(['user', 'project', 'local'])
  scope!: PluginInstallScope;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  installedVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  repoRemoteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  anonymousIdHash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  anonymousEmailMasked?: string;
}
