import { HttpStatus, Injectable, UnprocessableEntityException, } from '@nestjs/common';
import { ConfigService }                                         from '@nestjs/config';
import { OAuth2Client }                                          from 'google-auth-library';
import { AuthGoogleLoginDto }                                    from './dto/auth-google-login.dto';
import { AllConfigType }                                         from '@core/config/config.type';
import { SocialInterface }                                       from '@shared/social/interfaces/social.interface';
import { AppConfig }                                             from '@core/config/app-config.type';

@Injectable()
export class AuthGoogleService {
  private google: OAuth2Client;

  constructor(private configService: ConfigService<AllConfigType>) {
    this.google = new OAuth2Client(
      configService.get<AppConfig>('google.clientId', {infer: true}),
      configService.get<AppConfig>('google.clientSecret', {infer: true}),
    );
  }

  async getProfileByToken(
    loginDto: AuthGoogleLoginDto,
  ): Promise<SocialInterface> {
    const ticket = await this.google.verifyIdToken({
      idToken: loginDto.idToken,
      audience: [
        this.configService.getOrThrow<AppConfig>('google.clientId', {infer: true}),
      ],
    });

    const data = ticket.getPayload();

    if (!data) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'wrongToken',
        },
      });
    }

    return {
      id: data.sub,
      email: data.email,
      firstName: data.given_name,
      lastName: data.family_name,
    };
  }
}
