import { User } from '../../users/domain/user';

export class Session {
  id: number | string;
  user: User;
  hash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
