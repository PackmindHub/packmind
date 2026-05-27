import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ManifestCallbackDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;
}

export class InstallCallbackDto {
  @IsNumber()
  @IsNotEmpty()
  installationId!: number;
}
