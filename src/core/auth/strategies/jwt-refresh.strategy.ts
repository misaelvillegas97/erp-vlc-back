import { Strategy }                          from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy }                  from '@nestjs/passport';
import { ConfigService }                     from '@nestjs/config';
import { JwtRefreshPayloadType }             from './types/jwt-refresh-payload.type';
import { AllConfigType }                     from '@core/config/config.type';
import { OrNeverType }                       from '@shared/utils/types/or-never.type';
import { Request }                           from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService<AllConfigType>) {
    const tokenKey = configService.get<AllConfigType>('auth.refreshToken', {infer: true}) || 'refreshToken';

    super({
      jwtFromRequest: (req: Request) => {
        // Extract the refresh token from cookies
        return req.signedCookies[tokenKey];
      },
      secretOrKey: configService.get<AllConfigType>('auth.refreshSecret', {infer: true}),
    });
  }

  public validate(
    payload: JwtRefreshPayloadType,
  ): OrNeverType<JwtRefreshPayloadType> {
    if (!payload.sessionId) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
