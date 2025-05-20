import { Module }                      from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }               from '@nestjs/typeorm';
import { ThrottlerModule }             from '@nestjs/throttler';

import { I18nModule }                    from 'nestjs-i18n/dist/i18n.module';
import { HeaderResolver }                from 'nestjs-i18n';
import { DataSource, DataSourceOptions } from 'typeorm';
import path                              from 'path';

import { AuthModule }                      from '@core/auth/auth.module';
import authConfig                          from '@core/auth/config/auth.config';
import { AuthAppleModule }                 from '@core/auth-apple/auth-apple.module';
import appleConfig                         from '@core/auth-apple/config/apple.config';
import { AuthFacebookModule }              from '@core/auth-facebook/auth-facebook.module';
import facebookConfig                      from '@core/auth-facebook/config/facebook.config';
import { AuthGoogleModule }                from '@core/auth-google/auth-google.module';
import googleConfig                        from '@core/auth-google/config/google.config';
import { AuthTwitterModule }               from '@core/auth-twitter/auth-twitter.module';
import twitterConfig                       from '@core/auth-twitter/config/twitter.config';
import acConfig                            from '@core/config/ac.config';
import appConfig                           from '@core/config/app.config';
import cencoConfig                         from '@core/config/cenco.config';
import comercioConfig                      from '@core/config/comercio.config';
import { AllConfigType }                   from '@core/config/config.type';
import databaseConfig                      from '@core/database/config/database.config';
import { TypeOrmConfigService }            from '@core/database/typeorm-config.service';
import fileConfig                          from '@modules/files/config/file.config';
import { FilesModule }                     from '@modules/files/files.module';
import mailConfig                          from '@modules/mail/config/mail.config';
import { MailModule }                      from '@modules/mail/mail.module';
import { MailerModule }                    from '@modules/mailer/mailer.module';
import { SeederModule }                    from '@modules/seeder/seeder.module';
import { SessionModule }                   from '@modules/session/session.module';
import { UsersModule }                     from '@modules/users/users.module';
import { IntegrationsModule }              from '@modules/integrations/integrations.module';
import { OrdersModule }                    from '@modules/orders/orders.module';
import { ScheduleModule }                  from '@nestjs/schedule';
import { ClientsModule }                   from '@modules/clients/clients.module';
import { ServeStaticModule }               from '@nestjs/serve-static';
import { ProductsModule }                  from '@modules/products/products.module';
import { InvoicesModule }                  from '@modules/invoices/invoices.module';
import { EventEmitterModule }              from '@nestjs/event-emitter';
import { AppController }                   from './app.controller';
import { SupplierInvoicesModule }          from '@modules/supplier-invoices/supplier-invoices.module';
import { NotificationsModule }             from '@modules/notifications/notifications.module';
import { SupplierModule }                  from '@modules/supplier/supplier.module';
import { TypesModule }                     from '@modules/types/types.module';
import { LogisticsModule }                 from '@modules/logistics/logistics.module';
import { ConfigModule as AppConfigModule } from '@modules/config/config.module';
import gpsConfig                           from '@core/config/gps.config';
import { GpsModule }                       from '@modules/gps/gps.module';
import { HealthModule }                    from '@modules/health/health.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'public'),
      serveRoot: '/public',
      serveStaticOptions: {index: false}
    }),
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        facebookConfig,
        googleConfig,
        twitterConfig,
        appleConfig,
        acConfig,
        cencoConfig,
        comercioConfig,
        gpsConfig,
      ],
      envFilePath: [ '.env' ],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: {path: path.join(__dirname, 'core/i18n/'), watch: true},
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ ConfigService ],
        },
      ],
      imports: [ ConfigModule ],
      inject: [ ConfigService ],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 15 * 60 * 1000, // 15 minutes,
        limit: 100, // limit each IP to 100 requests per windowMs
      },
    ]),
    ScheduleModule.forRoot(),
    UsersModule,
    FilesModule,
    AuthModule,
    AuthFacebookModule,
    AuthGoogleModule,
    AuthTwitterModule,
    AuthAppleModule,
    SessionModule,
    MailModule,
    MailerModule,
    SeederModule,
    IntegrationsModule,
    InvoicesModule,
    SupplierModule,
    SupplierInvoicesModule,
    OrdersModule,
    ProductsModule,
    ClientsModule,
    NotificationsModule,
    TypesModule,
    LogisticsModule,
    AppConfigModule,
    GpsModule,
    HealthModule
  ],
  controllers: [ AppController ]
})
export class AppModule {}
