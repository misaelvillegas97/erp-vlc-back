import { AppConfig }      from './app-config.type';
import { AppleConfig }    from '@core/auth-apple/config/apple-config.type';
import { AuthConfig }     from '@core/auth/config/auth-config.type';
import { DatabaseConfig } from '@core/database/config/database-config.type';
import { FacebookConfig } from '@core/auth-facebook/config/facebook-config.type';
import { GoogleConfig }   from '@core/auth-google/config/google-config.type';
import { TwitterConfig }  from '@core/auth-twitter/config/twitter-config.type';
import { FileConfig }     from '@modules/files/config/file-config.type';
import { MailConfig }     from '@modules/mail/config/mail-config.type';
import { WhatsappConfig } from '@modules/notifications/config/whatsapp-config.type';
import { IProvider }      from '@core/config/interfaces/provider.interface';
import { GpsConfig }      from '@core/config/interfaces/gps.interface';

export type AllConfigType = {
  ac: { apikey: string };
  app: AppConfig;
  apple: AppleConfig;
  auth: AuthConfig;
  cencosud: IProvider;
  comercio: IProvider;
  database: DatabaseConfig;
  facebook: FacebookConfig;
  file: FileConfig;
  google: GoogleConfig;
  gps: GpsConfig;
  mail: MailConfig;
  whatsapp: WhatsappConfig;
  twitter: TwitterConfig;
};
