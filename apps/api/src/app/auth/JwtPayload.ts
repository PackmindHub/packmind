import { UserId } from '@packmind/types';

export interface JwtPayload {
  user: {
    name: string;
    userId: UserId;
  };
  iat: number;
  exp: number;
}
