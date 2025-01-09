import { Request as ExpressRequest } from 'express';

declare module 'express' {

  interface Request extends ExpressRequest {
    user: any;
    companyId: string;
  }
}
