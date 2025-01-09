import { Injectable }          from '@nestjs/common';
import { ConfigService }       from '@nestjs/config';
import Twitter                 from 'twitter';
import { AuthTwitterLoginDto } from './dto/auth-twitter-login.dto';
import { AllConfigType }       from '@core/config/config.type';
import { SocialInterface }     from '@shared/social/interfaces/social.interface';
import { AppConfig }           from '@core/config/app-config.type';

@Injectable()
export class AuthTwitterService {
  constructor(private configService: ConfigService<AllConfigType>) {}

  async getProfileByToken(
    loginDto: AuthTwitterLoginDto,
  ): Promise<SocialInterface> {
    const twitter = new Twitter({
      consumer_key: this.configService.getOrThrow<AppConfig>('twitter.consumerKey', {
        infer: true,
      }),
      consumer_secret: this.configService.getOrThrow<AppConfig>('twitter.consumerSecret', {
        infer: true,
      }),
      access_token_key: loginDto.accessTokenKey,
      access_token_secret: loginDto.accessTokenSecret,
    });

    const data: Twitter.ResponseData = await new Promise((resolve) => {
      twitter.get(
        'account/verify_credentials',
        {include_email: true},
        (error, profile) => {
          resolve(profile);
        },
      );
    });

    return {
      id: data.id?.toString(),
      email: data.email,
      firstName: data.name,
    };
  }
}
