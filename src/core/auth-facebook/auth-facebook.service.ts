import { Injectable }           from '@nestjs/common';
import { Facebook }             from 'fb';
import { ConfigService }        from '@nestjs/config';
import { FacebookInterface }    from './interfaces/facebook.interface';
import { AuthFacebookLoginDto } from './dto/auth-facebook-login.dto';
import { AllConfigType }        from '@core/config/config.type';
import { SocialInterface }      from '@shared/social/interfaces/social.interface';
import { AppConfig }            from '@core/config/app-config.type';

@Injectable()
export class AuthFacebookService {
  constructor(private configService: ConfigService<AllConfigType>) {}

  async getProfileByToken(
    loginDto: AuthFacebookLoginDto,
  ): Promise<SocialInterface> {
    const fb: Facebook = new Facebook({
      appId: this.configService.get<AppConfig>('facebook.appId', {
        infer: true,
      }),
      appSecret: this.configService.get<AppConfig>('facebook.appSecret', {
        infer: true,
      }),
      version: 'v7.0',
    });
    fb.setAccessToken(loginDto.accessToken);

    const data: FacebookInterface = await new Promise((resolve) => {
      fb.api(
        '/me',
        'get',
        {fields: 'id,last_name,email,first_name'},
        (response: FacebookInterface | PromiseLike<FacebookInterface>) => {
          resolve(response);
        },
      );
    });

    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
    };
  }
}
