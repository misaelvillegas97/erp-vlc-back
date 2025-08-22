import { Session } from '@modules/session/domain/session';

export type JwtRefreshPayloadType = {
  sessionId: Session['id'];
  hash: Session['hash'];
  tenantId?: string;
  iat: number;
  exp: number;
};
