import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, SerializeOptions, UseGuards, } from '@nestjs/common';
import { ConfigService }                                                                                            from '@nestjs/config';
import { AuthGuard }                                                                                                from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags }                                                                    from '@nestjs/swagger';

import { Request, Response } from 'express';

import { AllConfigType }         from '@core/config/config.type';
import { User }                  from '@modules/users/domain/user';
import { NullableType }          from '@shared/utils/types/nullable.type';
import { AuthService }           from './auth.service';
import { AuthConfirmEmailDto }   from './dto/auth-confirm-email.dto';
import { AuthEmailLoginDto }     from './dto/auth-email-login.dto';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';
import { AuthRegisterLoginDto }  from './dto/auth-register-login.dto';
import { AuthResetPasswordDto }  from './dto/auth-reset-password.dto';
import { AuthUpdateDto }         from './dto/auth-update.dto';
import { LoginResponseDto }      from './dto/login-response.dto';
import { RefreshResponseDto }    from './dto/refresh-response.dto';
import { AuthUserMapper }        from '@core/auth/mappers/auth-user.mapper';

@ApiTags('Auth')
@Controller({path: 'auth', version: '1'})
export class AuthController {
  private readonly cookiePath = '/api/v1/auth';
  private readonly cookieName: string;

  constructor(
    private readonly service: AuthService,
    private readonly configService: ConfigService<AllConfigType>
  ) {
    this.cookieName = this.configService.get<AllConfigType>('auth.refreshToken', {infer: true}) || 'refreshToken';
  }

  @SerializeOptions({groups: [ 'me' ]})
  @Post('email/login')
  @ApiOkResponse({type: LoginResponseDto})
  @HttpCode(HttpStatus.OK)
  public async login(@Body() loginDto: AuthEmailLoginDto, @Res() res: Response): Promise<void> {
    const login: LoginResponseDto = await this.service.validateLogin(loginDto);

    res
      .status(HttpStatus.OK)
      .cookie(this.cookieName, login.refreshToken.trim(), {
        secure: true,
        httpOnly: true,
        signed: true,
        path: this.cookiePath,
        expires: new Date(Date.now() + login.refreshTokenExpires * 1000),
        sameSite: 'none'
      })
      .header('Content-Type', 'application/json')
      .send({
        token: login.token,
        tokenExpires: login.tokenExpires,
        user: AuthUserMapper.map(login.user),
      });
  }

  @Post('email/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() createUserDto: AuthRegisterLoginDto): Promise<void> {
    return this.service.register(createUserDto);
  }

  @Post('email/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.service.confirmEmail(confirmEmailDto.hash);
  }

  @Post('email/confirm/new')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmNewEmail(@Body() confirmEmailDto: AuthConfirmEmailDto): Promise<void> {
    return this.service.confirmNewEmail(confirmEmailDto.hash);
  }

  @Post('forgot/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() forgotPasswordDto: AuthForgotPasswordDto): Promise<void> {
    return this.service.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() resetPasswordDto: AuthResetPasswordDto): Promise<void> {
    return this.service.resetPassword(
      resetPasswordDto.hash,
      resetPasswordDto.password,
    );
  }

  @ApiBearerAuth()
  @SerializeOptions({groups: [ 'me' ],})
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({type: User})
  @HttpCode(HttpStatus.OK)
  public me(@Req() request: Request): Promise<NullableType<User>> {
    return this.service.me(request.user);
  }

  @ApiBearerAuth()
  @ApiOkResponse({type: RefreshResponseDto})
  @SerializeOptions({groups: [ 'me' ]})
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  public async refresh(@Req() request: Request, @Res() res: Response): Promise<void> {
    const refreshData = await this.service.refreshToken({
      sessionId: request.user.sessionId,
      hash: request.user.hash,
    });

    // set cookie and return accessToken and user data
    res
      .status(HttpStatus.OK)
      .cookie(this.cookieName, refreshData.refreshToken, {
        secure: true,
        httpOnly: true,
        signed: true,
        path: this.cookiePath,
        expires: new Date(Date.now() + refreshData.refreshTokenExpires * 1000),
        sameSite: 'none'
      })
      .header('Content-Type', 'application/json')
      .send({
        token: refreshData.token,
        tokenExpires: refreshData.tokenExpires,
        user: AuthUserMapper.map(refreshData.user)
      });
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Req() request: Request): Promise<void> {
    await this.service.logout({
      sessionId: request.user.sessionId,
    });
  }

  @ApiBearerAuth()
  @SerializeOptions({groups: [ 'me' ]})
  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({type: User})
  public update(@Req() request: Request, @Body() userDto: AuthUpdateDto,): Promise<NullableType<User>> {
    return this.service.update(request.user, userDto);
  }

  @ApiBearerAuth()
  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@Req() request: Request): Promise<void> {
    return this.service.softDelete(request.user, request.user.sessionId);
  }
}
