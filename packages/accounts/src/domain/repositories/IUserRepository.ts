import { User } from '../entities/User';
import { IRepository } from '@packmind/shared';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByEmailCaseInsensitive(email: string): Promise<User | null>;
  list(): Promise<User[]>;
}
