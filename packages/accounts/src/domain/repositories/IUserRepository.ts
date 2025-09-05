import { User } from '../entities/User';
import { IRepository } from '@packmind/shared';

export interface IUserRepository extends IRepository<User> {
  findByUsername(username: string): Promise<User | null>;
  list(): Promise<User[]>;
}
