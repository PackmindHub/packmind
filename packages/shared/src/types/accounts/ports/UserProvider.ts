import { User, UserId } from '../User';

export interface UserProvider {
  getUserById(userId: UserId): Promise<User | null>;
}
