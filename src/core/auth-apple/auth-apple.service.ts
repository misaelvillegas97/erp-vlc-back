import { Injectable }        from '@nestjs/common';
import appleSignInAuth       from 'apple-signin-auth';
import { ConfigService }     from '@nestjs/config';
import { AuthAppleLoginDto } from './dto/auth-apple-login.dto';
import { AllConfigType }     from '@core/config/config.type';
import { SocialInterface }   from '@shared/social/interfaces/social.interface';
import { AppConfig }         from '@core/config/app-config.type';

@Injectable()
export class AuthAppleService {
  constructor(private configService: ConfigService<AllConfigType>) {}

  async getProfileByToken(
    loginDto: AuthAppleLoginDto,
  ): Promise<SocialInterface> {
    const data = await appleSignInAuth.verifyIdToken(loginDto.idToken, {
      audience: this.configService.get<AppConfig>('apple.appAudience', {infer: true}),
    });

    return {
      id: data.sub,
      email: data.email,
      firstName: loginDto.firstName,
      lastName: loginDto.lastName,
    };
  }
}
