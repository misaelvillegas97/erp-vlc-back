import { HttpStatus, Inject, Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { randomStringGenerator }                                                                                  from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService }                                                                                          from '@nestjs/config';
import { JwtService }                                                                                             from '@nestjs/jwt';

import bcrypt      from 'bcryptjs';
import ms          from 'ms';
import * as crypto from 'node:crypto';

import { AuthProvidersEnum }     from '@core/auth/auth-providers.enum';
import { AuthEmailLoginDto }     from '@core/auth/dto/auth-email-login.dto';
import { AuthRegisterLoginDto }  from '@core/auth/dto/auth-register-login.dto';
import { AuthUpdateDto }         from '@core/auth/dto/auth-update.dto';
import { LoginResponseDto }      from '@core/auth/dto/login-response.dto';
import { JwtPayloadType }        from '@core/auth/strategies/types/jwt-payload.type';
import { JwtRefreshPayloadType } from '@core/auth/strategies/types/jwt-refresh-payload.type';
import { AllConfigType }         from '@core/config/config.type';
import { UsersService }          from '@modules/users/users.service';
import { SessionService }        from '@modules/session/session.service';
import { MailService }           from '@modules/mail/mail.service';
import { User }                  from '@modules/users/domain/user';
import { RoleEnum }              from '@modules/roles/roles.enum';
import { StatusEnum }            from '@modules/statuses/domain/enum/statuses.enum';
import { Session }               from '@modules/session/domain/session';
import { SocialInterface }       from '@shared/social/interfaces/social.interface';
import { NullableType }          from '@shared/utils/types/nullable.type';
import { REQUEST }               from '@nestjs/core';
import { Request }               from 'express';
import { AppConfig }             from '@core/config/app-config.type';

@Injectable()
export class AuthService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private jwtService: JwtService,
    private usersService: UsersService,
    private sessionService: SessionService,
    private mailService: MailService,
    private configService: ConfigService<AllConfigType>,
  ) {}

  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) throw this.getUnprocessableEntityException({email: 'notFound'});

    if (user.provider !== AuthProvidersEnum.email) throw this.getUnprocessableEntityException({email: `needLoginViaProvider:${ user.provider }`});

    if (!user.password) throw this.getUnprocessableEntityException({password: 'incorrectPassword'});

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) throw this.getUnprocessableEntityException({password: 'incorrectPassword'});

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({user, hash});

    const {token, refreshToken, tokenExpires, refreshTokenExpires} = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      hash,
    });

    // Set token to response cookie
    // res.cookie('token', token, {

    return {
      refreshToken,
      refreshTokenExpires: +refreshTokenExpires,
      token,
      tokenExpires: +tokenExpires,
      user,
    };
  }

  async validateSocialLogin(authProvider: string, socialData: SocialInterface): Promise<LoginResponseDto> {
    let user: NullableType<User> = null;
    let userByEmail: NullableType<User> = null;
    const socialEmail = socialData.email?.toLowerCase();

    if (socialEmail)
      userByEmail = await this.usersService.findByEmail(socialEmail);

    if (socialData.id)
      user = await this.usersService
        .findBySocialIdAndProvider({
          socialId: socialData.id,
          provider: authProvider,
        });

    if (user) {
      if (socialEmail && !userByEmail) {
        user.email = socialEmail;
        await this.usersService.update(user.id, user);
      }
    } else if (userByEmail) {
      user = userByEmail;
    } else if (socialData.id) {
      const role = {
        id: RoleEnum.user,
      };
      const status = {
        id: StatusEnum.active,
      };

      user = await this.usersService.create({
        email: socialEmail ?? null,
        firstName: socialData.firstName ?? null,
        lastName: socialData.lastName ?? null,
        socialId: socialData.id,
        provider: authProvider,
        role,
        status,
      });

      user = await this.usersService.findById(user.id);
    }

    if (!user) throw this.getUnprocessableEntityException({user: 'USER_NOT_FOUND'});

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({user, hash});

    const {
      token: jwtToken,
      refreshToken,
      tokenExpires,
      refreshTokenExpires
    } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      hash,
    });

    return {
      refreshToken,
      refreshTokenExpires: +refreshTokenExpires,
      token: jwtToken,
      tokenExpires: +tokenExpires,
      user,
    };
  }

  async register(dto: AuthRegisterLoginDto): Promise<void> {
    const user = await this.usersService.create({
      ...dto,
      email: dto.email,
      role: {id: RoleEnum.user},
      status: {id: StatusEnum.inactive},
    });

    const hash = await this.jwtService.signAsync(
      {
        confirmEmailUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow<AppConfig>('auth.confirmEmailSecret', {infer: true}),
        expiresIn: this.configService.getOrThrow<AppConfig>('auth.confirmEmailExpires', {infer: true}),
      },
    );

    await this.mailService.userSignUp({
      to: dto.email,
      data: {
        hash,
      },
    });
  }

  async confirmEmail(hash: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow<AppConfig>('auth.confirmEmailSecret', {infer: true}),
      });

      userId = jwtData.confirmEmailUserId;
    } catch {
      throw this.getUnprocessableEntityException({hash: 'INVALID_HASH'});
    }

    const user = await this.usersService.findById(userId);

    if (
      !user ||
      user?.status?.id?.toString() !== StatusEnum.inactive.toString()
    ) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    user.status = {id: StatusEnum.active};

    await this.usersService.update(user.id, user);
  }

  async confirmNewEmail(hash: string): Promise<void> {
    let userId: User['id'];
    let newEmail: User['email'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
        newEmail: User['email'];
      }>(hash, {
        secret: this.configService.getOrThrow<AppConfig>('auth.confirmEmailSecret', {infer: true}),
      });

      userId = jwtData.confirmEmailUserId;
      newEmail = jwtData.newEmail;
    } catch {
      throw this.getUnprocessableEntityException({hash: 'INVALID_HASH'});
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    user.email = newEmail;
    user.status = {
      id: StatusEnum.active,
    };

    await this.usersService.update(user.id, user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw this.getUnprocessableEntityException({email: 'EMAIL_NOT_FOUND'});

    const tokenExpiresIn = this.configService.getOrThrow<AppConfig>('auth.forgotExpires', {infer: true});

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow<AppConfig>('auth.forgotSecret', {infer: true}),
        expiresIn: tokenExpiresIn,
      },
    );

    await this.mailService.forgotPassword({
      to: email,
      data: {
        hash,
        tokenExpires: +tokenExpires,
      },
    });
  }

  async resetPassword(hash: string, password: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        forgotUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow<AppConfig>('auth.forgotSecret', {infer: true}),
      });

      userId = jwtData.forgotUserId;
    } catch {
      throw this.getUnprocessableEntityException({hash: 'INVALID_HASH'});
    }

    const user = await this.usersService.findById(userId);

    if (!user) throw this.getUnprocessableEntityException({user: 'USER_NOT_FOUND'});

    user.password = password;

    await this.sessionService.deleteByUserId({userId: user.id});

    await this.usersService.update(user.id, user);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async me(_userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    return this.usersService.findById(this.request.user.id);
    // return this.usersService.findById(userJwtPayload.id);
  }

  async update(
    userJwtPayload: JwtPayloadType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    const currentUser = await this.usersService.findById(userJwtPayload.id);

    if (!currentUser) throw this.getUnprocessableEntityException({user: 'USER_NOT_FOUND'});

    if (userDto.password) {
      if (!userDto.oldPassword) throw this.getUnprocessableEntityException({oldPassword: 'MISSING_OLD_PASSWORD'});

      if (!currentUser.password) throw this.getUnprocessableEntityException({password: 'MISSING_PASSWORD'});

      const isValidOldPassword = await bcrypt.compare(
        userDto.oldPassword,
        currentUser.password,
      );

      if (!isValidOldPassword) throw this.getUnprocessableEntityException({oldPassword: 'INCORRECT_OLD_PASSWORD'});
      else await this.sessionService.deleteByUserIdWithExclude({
        userId: currentUser.id,
        excludeSessionId: userJwtPayload.sessionId
      });
    }

    if (userDto.email && userDto.email !== currentUser.email) {
      const userByEmail = await this.usersService.findByEmail(userDto.email);

      if (userByEmail && userByEmail.id !== currentUser.id)
        throw this.getUnprocessableEntityException({email: 'EMAIL_ALREADY_EXISTS'});

      const hash = await this.jwtService.signAsync(
        {
          confirmEmailUserId: currentUser.id,
          newEmail: userDto.email,
        },
        {
          secret: this.configService.getOrThrow<AppConfig>('auth.confirmEmailSecret', {infer: true}),
          expiresIn: this.configService.getOrThrow<AppConfig>('auth.confirmEmailExpires', {infer: true}),
        },
      );

      await this.mailService.confirmNewEmail({
        to: userDto.email,
        data: {
          hash,
        },
      });
    }

    delete userDto.email;
    delete userDto.oldPassword;

    await this.usersService.update(userJwtPayload.id, userDto);

    return this.usersService.findById(userJwtPayload.id);
  }

  async refreshToken(
    data: Pick<JwtRefreshPayloadType, 'sessionId' | 'hash'>,
  ): Promise<LoginResponseDto> {
    const session = await this.sessionService.findById(data.sessionId);

    if (!session || session.hash !== data.hash) throw new UnauthorizedException();

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const user = await this.usersService.findById(session.user.id);

    if (!user?.role) throw new UnauthorizedException();

    await this.sessionService.update(session.id, {
      hash,
    });

    const {token, refreshToken, tokenExpires, refreshTokenExpires} = await this.getTokensData({
      id: session.user.id,
      role: {
        id: user.role.id,
      },
      sessionId: session.id,
      hash,
    });

    return {
      token,
      tokenExpires: +tokenExpires,
      refreshToken,
      refreshTokenExpires: +refreshTokenExpires,
      user
    };
  }

  async softDelete(user: User, sessionId: Pick<JwtPayloadType, 'sessionId'>): Promise<void> {
    await this.usersService.remove(user.id);
    await this.logout(sessionId);
  }

  async logout(data: Pick<JwtRefreshPayloadType, 'sessionId'>) {
    return this.sessionService.deleteById(data.sessionId);
  }

  private getUnprocessableEntityException = (errors: Record<string, string> = {}) => new UnprocessableEntityException({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    errors
  });

  private async getTokensData(data: {
    id: User['id'];
    role: User['role'];
    sessionId: Session['id'];
    hash: Session['hash'];
  }) {
    const tokenExpiresIn = +this.configService.getOrThrow<AppConfig>('auth.expires', {infer: true});
    const refreshTokenExpiresIn = +this.configService.getOrThrow<AppConfig>('auth.refreshExpires', {infer: true});

    const tokenExpires = Date.now() + ms(tokenExpiresIn);
    const refreshTokenExpires = Date.now() + ms(refreshTokenExpiresIn);

    const [ token, refreshToken ] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow<AppConfig>('auth.secret', {infer: true}),
          expiresIn: tokenExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow<AppConfig>('auth.refreshSecret', {infer: true}),
          expiresIn: this.configService.getOrThrow<AppConfig>('auth.refreshExpires', {infer: true}),
        },
      ),
    ]);

    return {
      token,
      tokenExpires,
      refreshToken,
      refreshTokenExpires
    };
  }
}
