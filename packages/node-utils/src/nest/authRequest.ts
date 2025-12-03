import { Request } from 'express';
import { UserId } from '@packmind/types';

export interface AuthenticatedRequest extends Request {
  user: {
    name: string;
    userId: UserId;
  };
}
